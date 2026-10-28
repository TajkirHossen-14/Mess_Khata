import Resident from '../models/Resident.js';
import MealDeclaration from '../models/MealDeclaration.js';
import GuestMeal from '../models/GuestMeal.js';
import Notification from '../models/Notification.js';
import Bill from '../models/Bill.js';
import Payment from '../models/Payment.js';
import Complaint from '../models/Complaint.js';
import DutyAssignment from '../models/DutyAssignment.js';
import BillingPeriod from '../models/BillingPeriod.js';
import Mess from '../models/Mess.js';
import { getResidentMealWindow } from './mealWindowService.js';
import { isResidentActiveOn } from './membershipService.js';
import { getExpectedMeals } from './mealService.js';
import { findCurrentPeriodForMess } from './billingPeriodService.js';
import { listBillsForResident, getBalancesForBills } from './billService.js';
import { getUpcomingDutiesForResident } from './dutyService.js';
import { todayDhaka, calendarDateString, toCalendarDate, addDays } from '../utils/dateTime.js';

const fail = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ---- Pure helpers (unit tested, no database) ----

// A meal-window slot becomes 'on' (declared, count > 0), 'off' (declared, count 0)
// or null (nothing declared yet for that meal today).
export const deriveMealStatus = (slot) => {
  if (!slot || !slot.isDeclared) return null;
  return Number(slot.count) > 0 ? 'on' : 'off';
};

export const toTodayMealItem = (slot) => ({
  mealTypeId: String(slot.mealTypeId),
  name: slot.name,
  time: slot.time,
  status: deriveMealStatus(slot),
  isLocked: !slot.isOpen,
  cutoffAt: slot.cutoffAt,
});

export const formatDutyItem = (duty) => ({
  id: String(duty._id),
  type: duty.type,
  date: calendarDateString(duty.date),
});

export const formatNotificationItem = (item) => ({
  id: String(item._id),
  type: item.type,
  title: item.title,
  content: item.content,
  isRead: item.isRead,
  createdAt: item.createdAt,
});

// Reduce the Resident's rendered ISSUED bills (newest period first) into the billing widget.
export const summarizeBilling = (bills) => {
  let outstandingTotal = 0;
  let creditTotal = 0;
  let unpaidBillCount = 0;
  let pendingPaymentsTotal = 0;

  for (const bill of bills) {
    const outstanding = Number(bill.outstanding) || 0;
    if (outstanding > 0) {
      outstandingTotal += outstanding;
      unpaidBillCount += 1;
    } else if (outstanding < 0) {
      creditTotal += -outstanding;
    }
    pendingPaymentsTotal += Number(bill.pendingPayments) || 0;
  }

  const owing = bills
    .filter((bill) => (Number(bill.outstanding) || 0) > 0 && bill.dueDate)
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)));
  const nextDueBill = owing[0] || null;
  const latestBill = bills[0] || null;

  return {
    outstandingTotal,
    creditTotal,
    unpaidBillCount,
    pendingPaymentsTotal,
    nextDue: nextDueBill
      ? { billId: nextDueBill.id, dueDate: nextDueBill.dueDate, outstanding: nextDueBill.outstanding }
      : null,
    latestBill: latestBill
      ? {
          id: latestBill.id,
          period: latestBill.period,
          totalDue: latestBill.breakdown?.totalDue,
          outstanding: latestBill.outstanding,
          paymentStatus: latestBill.paymentStatus,
          dueDate: latestBill.dueDate,
        }
      : null,
  };
};

// Pure: mess-wide ISSUED bills -> outstanding total, residents with dues, overdue count.
export const summarizeMessBills = (bills, balances, todayStr) => {
  let outstandingTotal = 0;
  let overdueBills = 0;
  const owingResidents = new Set();
  for (const bill of bills) {
    const balance = balances.get(String(bill._id)) || { outstanding: bill.totalDue };
    const outstanding = Number(balance.outstanding) || 0;
    if (outstanding > 0) {
      outstandingTotal += outstanding;
      owingResidents.add(String(bill.residentId));
      if (calendarDateString(bill.dueDate) < todayStr) overdueBills += 1;
    }
  }
  return { outstandingTotal, residentsWithDues: owingResidents.size, overdueBills };
};

// Pure: a complaint never carries submitter information (anonymous identity is hidden).
export const buildComplaintItem = (complaint) => {
  const content = complaint.content || '';
  return {
    id: String(complaint._id),
    excerpt: content.length > 120 ? `${content.slice(0, 120)}…` : content,
    status: complaint.status,
    isAnonymous: !!complaint.isAnonymous,
    createdAt: complaint.createdAt,
  };
};

export const buildDutyWeekItem = (duty) => ({
  id: String(duty._id),
  date: calendarDateString(duty.date),
  type: duty.type,
  residentName: duty.residentId?.userId?.name || 'Unknown',
});

// ---- Database-backed helpers ----

const sumRows = (rows) => rows.reduce((sum, row) => sum + (Number(row.count) || 0), 0);

// This Resident's meals for the current period so far (never recomputes the whole mess).
const getResidentMealCounts = async (resident, period, now) => {
  if (!period) return null;

  const todayStr = todayDhaka(now);
  const periodEndStr = calendarDateString(period.endDate);
  const endStr = todayStr < periodEndStr ? todayStr : periodEndStr;
  const startDate = period.startDate;
  const endDate = toCalendarDate(endStr);

  const [declarations, guestMeals] = await Promise.all([
    MealDeclaration.find({ residentId: resident._id, date: { $gte: startDate, $lte: endDate } })
      .select('count')
      .lean(),
    GuestMeal.find({ responsibleResidentId: resident._id, date: { $gte: startDate, $lte: endDate } })
      .select('count')
      .lean(),
  ]);

  const own = sumRows(declarations);
  const guest = sumRows(guestMeals);
  return { own, guest, billable: own + guest };
};

export const getResidentDashboard = async (messId, userId, now = new Date()) => {
  const resident = await Resident.findOne({ userId, messId }).populate('userId', 'name').lean();
  if (!resident) throw fail('No resident profile in this mess', 403);

  const todayStr = todayDhaka(now);

  const [window, period] = await Promise.all([
    getResidentMealWindow(resident, todayStr, now),
    findCurrentPeriodForMess(messId, now),
  ]);

  const [bills, mealCounts, duties, notifications, unreadCount] = await Promise.all([
    listBillsForResident(messId, userId, now),
    getResidentMealCounts(resident, period, now),
    getUpcomingDutiesForResident(resident, { from: now, limit: 3 }),
    Notification.find({ recipientId: userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Notification.countDocuments({ recipientId: userId, isRead: false }),
  ]);

  return {
    resident: {
      id: String(resident._id),
      name: resident.userId?.name || 'Unknown',
      joiningDate: calendarDateString(resident.joiningDate),
      leavingDate: resident.leavingDate ? calendarDateString(resident.leavingDate) : null,
      isActiveToday: isResidentActiveOn(resident, todayStr),
    },
    today: {
      date: todayStr,
      meals: window.slots.map(toTodayMealItem),
    },
    period: period
      ? {
          id: String(period._id),
          startDate: calendarDateString(period.startDate),
          endDate: calendarDateString(period.endDate),
        }
      : null,
    mealCounts,
    billing: summarizeBilling(bills),
    notifications: {
      unreadCount,
      latest: notifications.map(formatNotificationItem),
    },
    upcomingDuties: duties.map(formatDutyItem),
  };
};

const toPeriodDto = (period) =>
  period
    ? {
        id: String(period._id),
        startDate: calendarDateString(period.startDate),
        endDate: calendarDateString(period.endDate),
      }
    : null;

const sumPendingPayments = async (residentIds) => {
  if (!residentIds.length) return { pendingCount: 0, pendingTotal: 0, oldestPendingAt: null };
  const [row] = await Payment.aggregate([
    { $match: { residentId: { $in: residentIds }, status: 'pending' } },
    { $group: { _id: null, pendingCount: { $sum: 1 }, pendingTotal: { $sum: '$amount' }, oldestPendingAt: { $min: '$createdAt' } } },
  ]);
  return {
    pendingCount: row?.pendingCount || 0,
    pendingTotal: row?.pendingTotal || 0,
    oldestPendingAt: row?.oldestPendingAt || null,
  };
};

const complaintCounts = async (residentIds) => {
  const empty = { openCount: 0, inReviewCount: 0 };
  if (!residentIds.length) return empty;
  const rows = await Complaint.aggregate([
    { $match: { residentId: { $in: residentIds } } },
    { $group: { _id: '$status', n: { $sum: 1 } } },
  ]);
  const map = new Map(rows.map((r) => [r._id, r.n]));
  return { openCount: map.get('open') || 0, inReviewCount: map.get('in_review') || 0 };
};

export const getManagerDashboard = async (messId, userId, now = new Date()) => {
  const todayStr = todayDhaka(now);
  const todayDate = toCalendarDate(todayStr);
  const weekEndDate = toCalendarDate(addDays(todayStr, 6));

  const [mess, residents] = await Promise.all([
    Mess.findOne({ _id: messId }).select('name code').lean(),
    Resident.find({ messId }).select('_id joiningDate leavingDate').lean(),
  ]);

  const residentIds = residents.map((r) => r._id);
  const activeResidentIds = residents.filter((r) => isResidentActiveOn(r, todayStr)).map((r) => r._id);

  const [expected, currentPeriod, latestEnded, issuedBills, pending, complaintStats, complaintLatest, dutyWeek, unreadCount] =
    await Promise.all([
      getExpectedMeals(messId, todayStr, { activeResidentIds }),
      findCurrentPeriodForMess(messId, now),
      BillingPeriod.findOne({ messId, endDate: { $lt: todayDate } }).sort({ endDate: -1 }),
      Bill.find({ residentId: { $in: residentIds }, status: 'issued' }).lean(),
      sumPendingPayments(residentIds),
      complaintCounts(residentIds),
      residentIds.length
        ? Complaint.find({ residentId: { $in: residentIds } }).sort({ createdAt: -1 }).limit(5).lean()
        : Promise.resolve([]),
      DutyAssignment.find({ messId, status: 'assigned', date: { $gte: todayDate, $lte: weekEndDate } })
        .sort({ date: 1 })
        .populate({ path: 'residentId', select: 'userId', populate: { path: 'userId', select: 'name' } }),
      Notification.countDocuments({ recipientId: userId, isRead: false }),
    ]);

  const balances = await getBalancesForBills(issuedBills);
  const billing = summarizeMessBills(issuedBills, balances, todayStr);

  let latestEndedDto = null;
  if (latestEnded) {
    const hasIssuedBills = Boolean(await Bill.exists({ billingPeriodId: latestEnded._id, status: 'issued' }));
    latestEndedDto = { ...toPeriodDto(latestEnded), hasIssuedBills };
  }

  return {
    mess: { name: mess?.name || '', code: mess?.code || '' },
    residents: { active: activeResidentIds.length, total: residents.length },
    today: { date: todayStr, expectedMeals: expected.expectedMeals, totalExpected: expected.totalExpected },
    periods: { current: toPeriodDto(currentPeriod), latestEnded: latestEndedDto },
    billing,
    payments: pending,
    complaints: { ...complaintStats, latest: complaintLatest.map(buildComplaintItem) },
    dutyThisWeek: dutyWeek.map(buildDutyWeekItem),
    notifications: { unreadCount },
  };
};

export default { getResidentDashboard, getManagerDashboard };
