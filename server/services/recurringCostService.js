import Expense from '../models/Expense.js';
import RecurringCost from '../models/RecurringCost.js';

export async function applyRecurringCostsToPeriod(billingPeriod) {
  const templates = await RecurringCost.find({
    messId: billingPeriod.messId,
    isActive: true,
  });

  if (templates.length === 0) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    const filter = {
      billingPeriodId: billingPeriod._id,
      recurringCostId: template._id,
    };
    const expenseData = {
      category: template.category,
      amount: template.amount,
      date: billingPeriod.startDate,
      billingPeriodId: billingPeriod._id,
      recurringCostId: template._id,
      description: template.name,
      createdBy: template.createdBy,
    };

    try {
      const result = await Expense.updateOne(
        filter,
        { $setOnInsert: expenseData },
        { upsert: true }
      );

      if (result.upsertedCount > 0 || result.upsertedId) {
        created += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      if (error.code === 11000) {
        skipped += 1;
      } else {
        throw error;
      }
    }
  }

  return { created, skipped };
}
