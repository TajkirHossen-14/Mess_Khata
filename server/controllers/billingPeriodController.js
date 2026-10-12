import BillingPeriod from '../models/BillingPeriod.js';

const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

export const createBillingPeriod = async (req, res, next) => {
  if (!req.messId) {
    return badRequest(res, 'Mess context is required');
  }

  const { startDate, endDate } = req.body ?? {};
  if (
    startDate == null || startDate === '' ||
    endDate == null || endDate === ''
  ) {
    return badRequest(res, 'startDate and endDate are required');
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);
  if (
    Number.isNaN(parsedStartDate.getTime()) ||
    Number.isNaN(parsedEndDate.getTime())
  ) {
    return badRequest(res, 'startDate and endDate must be valid dates');
  }

  if (parsedEndDate < parsedStartDate) {
    return badRequest(res, 'endDate cannot be earlier than startDate');
  }

  try {
    const createdPeriod = await BillingPeriod.create({
      messId: req.messId,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    return res.status(201).json({ success: true, data: createdPeriod });
  } catch (error) {
    return next(error);
  }
};
