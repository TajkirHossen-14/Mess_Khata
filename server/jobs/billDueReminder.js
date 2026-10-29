import { getPeriodForMess } from '../services/billingPeriodService.js';
import { getBalancesForBills } from '../services/billService.js';
import Bill from '../models/Bill.js';
import { createNotification } from '../services/notificationService.js';
import { todayDhaka } from '../utils/dateTime.js';

export function getReminderOffset(dueDateStr, todayStr) {
  const due = new Date(dueDateStr + 'T00:00:00Z');
  const today = new Date(todayStr + 'T00:00:00Z');
  const diff = Math.round((due - today) / 86400000);
  if (diff === 2) return 2;
  if (diff === 0) return 0;
  if (diff === -1) return -1;
  return null;
}

let isRunning = false;
export async function runBillDueReminders(now = new Date(), { ignoreTimeGate = false } = {}) {
  if (isRunning) return { checked: 0, notified: 0 };
  const { isPastDhakaHour } = await import('../utils/dateTime.js');
  if (!ignoreTimeGate && !isPastDhakaHour(now, 10)) return { checked: 0, notified: 0 };
  isRunning = true;
  try {
    const today = todayDhaka(now);
    const bills = await Bill.find({ status: 'issued' }).lean();
    const balances = await getBalancesForBills(bills);
    let checked = 0, notified = 0;
    for (const bill of bills) {
      const offset = getReminderOffset(bill.dueDate.toISOString().slice(0, 10), today);
      if (offset === null) continue;
      const bal = balances.get(String(bill._id));
      if (!bal || bal.outstanding <= 0) continue;
      checked++;
      const Resident = (await import('../models/Resident.js')).default;
      const resident = await Resident.findById(bill.residentId).populate('userId').lean();
      if (!resident?.userId?._id) continue;
      const title = offset === 2 ? 'Bill due in 2 days' : offset === 0 ? 'Bill due today' : 'Bill overdue';
      await createNotification({ recipientId: resident.userId._id, type: 'bill_due', title, content: `Outstanding ${bal.outstanding}`, dedupeKey: `bill_due:${bill._id}:${offset}` });
      notified++;
    }
    return { checked, notified };
  } finally {
    isRunning = false;
  }
}

export default { getReminderOffset, runBillDueReminders };
