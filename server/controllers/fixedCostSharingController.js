import {
  finalizeFixedCostSplit,
  getPolicy,
  getSavedSplits,
  previewFixedCostSplit,
  updatePolicy,
} from '../services/fixedCostSharingService.js';

const badRequest = (res, message) => res.status(400).json({ success: false, message });
const notFound = (res, message) => res.status(404).json({ success: false, message });
const conflict = (res, message) => res.status(409).json({ success: false, message });

const handleServiceError = (res, next, error) => {
  if (error?.statusCode === 400) {
    return badRequest(res, error.message);
  }

  if (error?.statusCode === 404) {
    return notFound(res, error.message);
  }

  if (error?.statusCode === 409) {
    return conflict(res, error.message);
  }

  return next(error);
};

export const getFixedCostPolicy = async (req, res, next) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const policy = await getPolicy(req.messId);
    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

export const updateFixedCostPolicy = async (req, res, next) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const policy = await updatePolicy(req.messId, req.body ?? {});
    return res.status(200).json({ success: true, data: policy });
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

export const calculateFixedCostPreview = async (req, res, next) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const { billingPeriodId } = req.body ?? {};
    if (!billingPeriodId) {
      return badRequest(res, 'billingPeriodId is required');
    }

    const preview = await previewFixedCostSplit(req.messId, billingPeriodId);
    return res.status(200).json({ success: true, data: preview });
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

export const finalizeFixedCostPreview = async (req, res, next) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const { billingPeriodId } = req.body ?? {};
    if (!billingPeriodId) {
      return badRequest(res, 'billingPeriodId is required');
    }

    const finalizedSplit = await finalizeFixedCostSplit(req.messId, billingPeriodId);
    return res.status(201).json({ success: true, data: finalizedSplit });
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};

export const getFixedCostSplits = async (req, res, next) => {
  try {
    if (!req.messId) {
      return badRequest(res, 'Mess context is required');
    }

    const { billingPeriodId } = req.query ?? {};
    const splits = await getSavedSplits(req.messId, billingPeriodId);
    return res.status(200).json({ success: true, data: splits });
  } catch (error) {
    return handleServiceError(res, next, error);
  }
};
