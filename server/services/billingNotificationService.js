import Resident from '../models/Resident.js';
import Manager from '../models/Manager.js';
import BillingPeriod from '../models/BillingPeriod.js';
import { createNotification } from './notificationService.js';
import { formatTaka } from '../utils/formatTaka.js';
import { calendarDateString } from '../utils/dateTime.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Pure text builders (Asia/Dhaka calendar dates, no Intl). Exported for unit tests.
export const dayMonth = (dateStr) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
};
export const dayMonthYear = (dateStr) => `${dayMonth(dateStr)} ${String(dateStr).slice(0, 4)}`;

export const billReadyContent = ({ startDate, endDate, totalDue, dueDate }) =>
  `Bill for ${dayMonth(startDate)} - ${dayMonth(endDate)}: ${formatTaka(totalDue)}, due by ${dayMonthYear(dueDate)}.`;

export const paymentSubmittedContent = ({ residentName, amount, method, startDate, endDate }) =>
  `${residentName} submitted ${formatTaka(amount)} via ${method} for ${dayMonth(startDate)} - ${dayMonth(endDate)}.`;

export const paymentConfirmedContent = ({ amount }) => `Your payment of ${formatTaka(amount)} was confirmed.`;
export const paymentRejectedContent = ({ amount, reason }) => `Your payment of ${formatTaka(amount)} was rejected. Reason: ${reason}`;

const residentUserId = async (residentId) => {
  const resident = await Resident.findById(residentId).select('userId').lean();
  return resident?.userId || null;
};

const periodRange = async (billingPeriodId) => {
  const period = await BillingPeriod.findById(billingPeriodId).select('startDate endDate').lean();
  if (!period) return { startDate: '', endDate: '' };
  return { startDate: calendarDateString(period.startDate), endDate: calendarDateString(period.endDate) };
};

// Every function is wrapped so a notification failure is logged and swallowed;
// it must never fail the underlying financial action.
export const notifyBillsGenerated = async (bills) => {
  try {
    for (const bill of bills) {
      try {
        const uid = await residentUserId(bill.residentId);
        if (!uid) continue;
        const { startDate, endDate } = await periodRange(bill.billingPeriodId);
        await createNotification({
          recipientId: uid,
          type: 'bill_due',
          title: 'Your bill is ready',
          content: billReadyContent({ startDate, endDate, totalDue: bill.totalDue, dueDate: calendarDateString(bill.dueDate) }),
          dedupeKey: `bill_generated:${bill._id}`,
        });
      } catch (e) { console.error('notifyBillsGenerated per-bill failed', e); }
    }
  } catch (e) { console.error('notifyBillsGenerated failed', e); }
};

export const notifyPaymentSubmitted = async (payment) => {
  try {
    const submitterUid = await residentUserId(payment.residentId);
    if (!submitterUid) return;
    // A payment does not carry messId; resolve it from the paying Resident.
    const resident = await Resident.findById(payment.residentId).populate('userId', 'name').lean();
    if (!resident?.messId) return;
    const managers = await Manager.find({ messId: resident.messId }).select('userId').lean();
    const managerUserIds = managers.map((m) => m.userId).filter(Boolean);
    const { startDate, endDate } = await periodRange(payment.billingPeriodId);
    const content = paymentSubmittedContent({
      residentName: resident.userId?.name || 'A resident',
      amount: payment.amount,
      method: payment.method,
      startDate,
      endDate,
    });
    for (const uid of managerUserIds) {
      if (String(uid) === String(submitterUid)) continue; // never notify the submitter
      await createNotification({
        recipientId: uid,
        type: 'payment_status',
        title: 'Payment awaiting confirmation',
        content,
        dedupeKey: `payment_submitted:${payment._id}`,
      });
    }
  } catch (e) { console.error('notifyPaymentSubmitted failed', e); }
};

export const notifyPaymentReviewed = async (payment, { confirmed, reason } = {}) => {
  try {
    const uid = await residentUserId(payment.residentId);
    if (!uid) return;
    if (confirmed) {
      await createNotification({
        recipientId: uid,
        type: 'payment_status',
        title: 'Payment confirmed',
        content: paymentConfirmedContent({ amount: payment.amount }),
        dedupeKey: `payment_confirmed:${payment._id}`,
      });
    } else {
      await createNotification({
        recipientId: uid,
        type: 'payment_status',
        title: 'Payment rejected',
        content: paymentRejectedContent({ amount: payment.amount, reason }),
        dedupeKey: `payment_rejected:${payment._id}`,
      });
    }
  } catch (e) { console.error('notifyPaymentReviewed failed', e); }
};

export default { notifyBillsGenerated, notifyPaymentSubmitted, notifyPaymentReviewed, billReadyContent, paymentSubmittedContent, paymentConfirmedContent, paymentRejectedContent };
