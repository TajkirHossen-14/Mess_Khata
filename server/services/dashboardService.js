import Mess from '../models/Mess.js';
import Resident from '../models/Resident.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';
import BillingPeriod from '../models/BillingPeriod.js';
import Complaint from '../models/Complaint.js';
import DutyAssignment from '../models/DutyAssignment.js';
import MealType from '../models/MealType.js';
import MealDeclaration from '../models/MealDeclaration.js';
import GuestMeal from '../models/GuestMeal.js';
import { todayDhaka, calendarDateString, toCalendarDate, addDays } from '../utils/dateTime.js';
import { isResidentActiveOn, clipToMembershipWindow } from './membershipService.js';
import { getBalancesForBills } from './billService.js';
import { getResidentDayView } from './mealDeclarationService.js';

// A Resident's meal counts within their membership-clipped slice of a period.
// Computed directly for one Resident (never the whole mess's meal records).
async function residentMealCounts(resident, period) {
  if (!period) return null;
  const window = clipToMembershipWindow(resident, calendarDateString(period.startDate), calendarDateString(period.endDate));
  if (!window) return { own: 0, guest: 0, billable: 0 };
  const range = { $gte: toCalendarDate(window.start), $lte: toCalendarDate(window.end) };
  const [own, guestRows] = await Promise.all([
    MealDeclaration.countDocuments({ residentId: resident._id, status: 'on', date: range }),
    GuestMeal.find({ responsibleResidentId: resident._id, date: range }).select('count').lean(),
  ]);
  const guest = guestRows.reduce((sum, g) => sum + g.count, 0);
  return { own, guest, billable: own + guest };
}

export async function getResidentDashboard(messId, userId, now = new Date()) {
  const resident = await Resident.findOne({ messId, userId }).populate('userId', 'name');
  if (!resident) return null;
  const today = todayDhaka(now);
  const bills = await Bill.find({ residentId: resident._id, status: 'issued' }).sort({ createdAt: -1 }).lean();
  const balances = await getBalancesForBills(bills);
  let outstandingTotal = 0, creditTotal = 0, pendingPaymentsTotal = 0, unpaidBillCount = 0;
  const dueBills = [];
  for (const bill of bills) {
    const b = balances.get(String(bill._id));
    outstandingTotal += Math.max(b.outstanding, 0);
    creditTotal += Math.max(-b.outstanding, 0);
    pendingPaymentsTotal += b.pendingPayments;
    if (b.outstanding > 0) { unpaidBillCount += 1; dueBills.push({ billId: bill._id, dueDate: calendarDateString(bill.dueDate), outstanding: b.outstanding }); }
  }
  dueBills.sort((a, z) => (a.dueDate < z.dueDate ? -1 : 1));
  const period = await BillingPeriod.findOne({ messId, startDate: { $lte: toCalendarDate(today) }, endDate: { $gte: toCalendarDate(today) } }).lean();
  const mealCounts = await residentMealCounts(resident, period);
  const [dayView, notifications, unreadCount, duties] = await Promise.all([
    getResidentDayView({ messId, userId, dateStr: today, now }),
    Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
    DutyAssignment.find({ residentId: resident._id, status: 'assigned', date: { $gte: toCalendarDate(today) } }).sort({ date: 1 }).limit(3).lean(),
  ]);
  const firstBill = bills[0] ? { ...bills[0] } : null;
  const firstBal = bills[0] ? balances.get(String(bills[0]._id)) : null;
  return {
    resident: { id: resident._id, name: resident.userId?.name, joiningDate: resident.joiningDate, leavingDate: resident.leavingDate, isActiveToday: isResidentActiveOn(resident, today) },
    today: { date: today, meals: dayView.meals },
    period: period ? { id: period._id, startDate: calendarDateString(period.startDate), endDate: calendarDateString(period.endDate) } : null,
    mealCounts,
    billing: {
      outstandingTotal,
      creditTotal,
      unpaidBillCount,
      pendingPaymentsTotal,
      nextDue: dueBills[0] || null,
      latestBill: firstBill ? {
        id: firstBill._id,
        period: period ? { startDate: calendarDateString(period.startDate), endDate: calendarDateString(period.endDate) } : null,
        totalDue: firstBill.totalDue,
        outstanding: firstBal.outstanding,
        paymentStatus: firstBal.paymentStatus,
        dueDate: calendarDateString(firstBill.dueDate),
      } : null,
    },
    notifications: {
      unreadCount,
      latest: notifications.map((n) => ({ id: n._id, type: n.type, title: n.title, content: n.content, isRead: n.isRead, createdAt: n.createdAt })),
    },
    upcomingDuties: duties.map((d) => ({ id: d._id, type: d.type, date: calendarDateString(d.date) })),
  };
}

export async function getManagerDashboard(messId, userId, now = new Date()) {
  const today = todayDhaka(now);
  const todayDate = toCalendarDate(today);
  const [mess, residents] = await Promise.all([
    Mess.findById(messId).lean(),
    Resident.find({ messId }).populate('userId', 'name').lean(),
  ]);
  const residentIds = residents.map((r) => r._id);
  const activeResidentIds = residents.filter((r) => isResidentActiveOn(r, today)).map((r) => r._id);
  const activeSet = new Set(activeResidentIds.map(String));

  // Today's expected meals per active meal type (one grouped read each).
  const mealTypes = await MealType.find({ messId, isActive: true }).sort({ time: 1 }).lean();
  const todayMid = toCalendarDate(today);
  const [decls, guests] = await Promise.all([
    MealDeclaration.find({ mealTypeId: { $in: mealTypes.map((m) => m._id) }, date: todayMid, status: 'on' }).select('mealTypeId residentId').lean(),
    GuestMeal.find({ mealTypeId: { $in: mealTypes.map((m) => m._id) }, date: todayMid }).select('mealTypeId count responsibleResidentId').lean(),
  ]);
  const ownByType = new Map(), guestByType = new Map();
  for (const d of decls) if (activeSet.has(String(d.residentId))) ownByType.set(String(d.mealTypeId), (ownByType.get(String(d.mealTypeId)) || 0) + 1);
  for (const g of guests) if (activeSet.has(String(g.responsibleResidentId))) guestByType.set(String(g.mealTypeId), (guestByType.get(String(g.mealTypeId)) || 0) + g.count);
  const expectedMeals = mealTypes.map((m) => {
    const ownOn = ownByType.get(String(m._id)) || 0;
    const guestCount = guestByType.get(String(m._id)) || 0;
    return { mealTypeId: m._id, name: m.name, time: m.time, ownOn, guestCount, total: ownOn + guestCount };
  });
  const totalExpected = expectedMeals.reduce((s, m) => s + m.total, 0);

  // Billing across the mess's ISSUED bills (scoped to this mess's residents).
  const bills = await Bill.find({ residentId: { $in: residentIds }, status: 'issued' }).lean();
  const balances = await getBalancesForBills(bills);
  let outstandingTotal = 0, overdueBills = 0;
  const residentsWithDues = new Set();
  for (const bill of bills) {
    const b = balances.get(String(bill._id));
    if (b.outstanding > 0) { outstandingTotal += b.outstanding; residentsWithDues.add(String(bill.residentId)); if (calendarDateString(bill.dueDate) < today) overdueBills += 1; }
  }

  // Pending payments for this mess's residents.
  const pending = await Payment.find({ residentId: { $in: residentIds }, status: 'pending' }).select('amount createdAt').lean();
  const pendingTotal = pending.reduce((s, p) => s + p.amount, 0);
  const oldestPendingAt = pending.length ? pending.reduce((min, p) => (p.createdAt < min ? p.createdAt : min), pending[0].createdAt) : null;

  // Complaints (never include submitter identity). Scoped through this mess's residents.
  const [complaintRows, openCount, inReviewCount] = await Promise.all([
    Complaint.find({ residentId: { $in: residentIds } }).sort({ createdAt: -1 }).limit(5).lean(),
    Complaint.countDocuments({ residentId: { $in: residentIds }, status: 'open' }),
    Complaint.countDocuments({ residentId: { $in: residentIds }, status: 'in_review' }),
  ]);

  // Current + latest-ended periods.
  const [current, latestEnded] = await Promise.all([
    BillingPeriod.findOne({ messId, startDate: { $lte: todayDate }, endDate: { $gte: todayDate } }).lean(),
    BillingPeriod.findOne({ messId, endDate: { $lt: todayDate } }).sort({ endDate: -1 }).lean(),
  ]);
  const latestEndedWithBills = latestEnded ? { id: latestEnded._id, startDate: calendarDateString(latestEnded.startDate), endDate: calendarDateString(latestEnded.endDate), hasIssuedBills: Boolean(await Bill.exists({ billingPeriodId: latestEnded._id, status: 'issued' })) } : null;

  // Duty roster for the coming week.
  const dutyRows = await DutyAssignment.find({ messId, status: 'assigned', date: { $gte: todayDate, $lte: toCalendarDate(addDays(today, 6)) } }).sort({ date: 1 }).lean();
  const nameByResident = new Map(residents.map((r) => [String(r._id), r.userId?.name || '']));

  const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

  return {
    mess: { name: mess?.name || '', code: mess?.code || '' },
    residents: { active: activeResidentIds.length, total: residents.length },
    today: { date: today, expectedMeals, totalExpected },
    periods: {
      current: current ? { id: current._id, startDate: calendarDateString(current.startDate), endDate: calendarDateString(current.endDate) } : null,
      latestEnded: latestEndedWithBills,
    },
    billing: { outstandingTotal, residentsWithDues: residentsWithDues.size, overdueBills },
    payments: { pendingCount: pending.length, pendingTotal, oldestPendingAt },
    complaints: {
      openCount,
      inReviewCount,
      latest: complaintRows.map((c) => ({ id: c._id, excerpt: String(c.content || '').slice(0, 140), status: c.status, isAnonymous: Boolean(c.isAnonymous), createdAt: c.createdAt })),
    },
    dutyThisWeek: dutyRows.map((d) => ({ id: d._id, date: calendarDateString(d.date), type: d.type, residentName: nameByResident.get(String(d.residentId)) || '' })),
    notifications: { unreadCount },
  };
}
