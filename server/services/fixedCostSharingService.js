import mongoose from 'mongoose';
import BillingPeriod from '../models/BillingPeriod.js';
import Expense from '../models/Expense.js';
import FixedCostPolicy from '../models/FixedCostPolicy.js';
import FixedCostSplit from '../models/FixedCostSplit.js';
import Resident from '../models/Resident.js';
import {
  DEFAULT_EQUAL_POLICY,
  FixedCostSplitValidationError,
  SUPPORTED_POLICY_MODES,
  calculateFixedCostSplit,
} from '../utils/fixedCostSplit.js';

const FIXED_COST_CATEGORIES = ['fixed', 'utility'];

const withStatus = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toObjectIdString = (value) => String(value);

const sanitizePolicy = (policy) => {
  const normalized = policy ?? DEFAULT_EQUAL_POLICY;
  const mode = SUPPORTED_POLICY_MODES.includes(normalized.mode) ? normalized.mode : 'equal';

  return {
    mode,
    seatCounts: normalizeResidentConfig(normalized.seatCounts, 'seatCounts'),
    customPercentages: normalizeResidentConfig(normalized.customPercentages, 'customPercentages'),
  };
};

const normalizeResidentConfig = (config, label) => {
  if (config == null) {
    return {};
  }
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw withStatus(400, `${label} must be an object keyed by resident IDs.`);
  }

  const normalized = {};
  for (const [residentId, value] of Object.entries(config)) {
    if (!mongoose.Types.ObjectId.isValid(residentId)) {
      throw withStatus(400, `Invalid resident ID in ${label}.`);
    }

    const normalizedResidentId = residentId.toLowerCase();
    if (Object.hasOwn(normalized, normalizedResidentId)) {
      throw withStatus(400, `Duplicate resident ID in ${label}.`);
    }
    normalized[normalizedResidentId] = value;
  }
  return normalized;
};

const normalizePolicyInput = (input) => {
  const payload = input ?? {};
  const mode = payload.mode ?? 'equal';

  if (!SUPPORTED_POLICY_MODES.includes(mode)) {
    throw withStatus(400, 'Unsupported sharing mode.');
  }

  const seatCounts = normalizeResidentConfig(payload.seatCounts, 'seatCounts');
  const customPercentages = normalizeResidentConfig(payload.customPercentages, 'customPercentages');

  if (mode === 'per_seat') {
    Object.entries(seatCounts).forEach(([residentId, value]) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || !Number.isSafeInteger(numeric) || numeric < 1) {
        throw withStatus(400, 'Seat counts must be positive whole numbers.');
      }
    });
  }

  if (mode === 'custom') {
    if (Object.keys(customPercentages).length === 0) {
      throw withStatus(400, 'Custom percentages are required when mode is custom.');
    }

    let basisPointsTotal = 0;
    Object.entries(customPercentages).forEach(([residentId, value]) => {
      const text = String(value).trim();
      if (!/^(?:\d+|\d+\.\d{1,2})$/.test(text)) {
        throw withStatus(400, 'Custom percentages may have at most two decimal places.');
      }

      const numeric = Number(text);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
        throw withStatus(400, 'Custom percentages must be between 0 and 100.');
      }

      basisPointsTotal += Math.round(numeric * 100);
    });

    if (basisPointsTotal !== 10000) {
      throw withStatus(400, 'Custom percentages must total exactly 100%.');
    }
  }

  return {
    mode,
    seatCounts,
    customPercentages,
  };
};

const validatePolicyResidentsBelongToMess = async (messId, policy) => {
  const configuredIds = [
    ...Object.keys(policy.seatCounts),
    ...Object.keys(policy.customPercentages),
  ];
  const residentIds = [...new Set(configuredIds)];

  if (residentIds.length === 0) {
    return;
  }

  if (residentIds.some((residentId) => !mongoose.Types.ObjectId.isValid(residentId))) {
    throw withStatus(400, 'Invalid resident ID in fixed-cost policy.');
  }

  const residents = await Resident.find({
    _id: { $in: residentIds },
    messId,
  }).select('_id').lean();
  const residentsInMess = new Set(residents.map((resident) => toObjectIdString(resident._id).toLowerCase()));
  const invalidResidentIds = residentIds.filter((residentId) => !residentsInMess.has(residentId));

  if (invalidResidentIds.length > 0) {
    throw withStatus(400, 'Policy resident IDs must belong to the current mess.');
  }
};

const buildPolicyForResidents = (policy, residentIds) => {
  const normalized = sanitizePolicy(policy);
  const residentKeys = residentIds.map((resident) => toObjectIdString(resident._id ?? resident).toLowerCase());

  if (normalized.mode === 'per_seat') {
    const seatCounts = { ...normalized.seatCounts };
    residentKeys.forEach((residentId) => {
      if (!(residentId in seatCounts)) {
        seatCounts[residentId] = 1;
      }
    });
    return { ...normalized, seatCounts };
  }

  return normalized;
};

const getExistingFinalizedSplit = async (billingPeriodId, messId) => {
  const split = await FixedCostSplit.findOne({ billingPeriodId, messId }).lean();
  return split;
};

const loadBillingPeriodAndEnsureScope = async (messId, billingPeriodId) => {
  if (!mongoose.Types.ObjectId.isValid(billingPeriodId)) {
    throw withStatus(400, 'Invalid billingPeriodId.');
  }

  const billingPeriod = await BillingPeriod.findById(billingPeriodId);
  if (!billingPeriod) {
    throw withStatus(404, 'Billing period not found.');
  }

  if (toObjectIdString(billingPeriod.messId) !== toObjectIdString(messId)) {
    throw withStatus(404, 'Billing period was not found for this mess.');
  }

  return billingPeriod;
};

const loadEligibleResidents = async (messId, billingPeriod) => {
  const residents = await Resident.find({ messId }).lean();

  const eligibleResidents = residents.filter((resident) => {
    const joiningDate = resident.joiningDate ? new Date(resident.joiningDate) : null;
    const leavingDate = resident.leavingDate ? new Date(resident.leavingDate) : null;
    const endDate = billingPeriod.endDate ? new Date(billingPeriod.endDate) : null;
    const startDate = billingPeriod.startDate ? new Date(billingPeriod.startDate) : null;

    if (!joiningDate || !endDate || !startDate) {
      return false;
    }

    const overlapsMembership = joiningDate <= endDate && (!leavingDate || leavingDate >= startDate);
    return overlapsMembership;
  });

  return eligibleResidents;
};

const getFixedCostTotalForBillingPeriod = async (billingPeriodId) => {
  const [result] = await Expense.aggregate([
    {
      $match: {
        billingPeriodId: new mongoose.Types.ObjectId(billingPeriodId),
        category: { $in: FIXED_COST_CATEGORIES },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return result?.total ?? 0;
};

const getCurrentPolicy = async (messId) => {
  const savedPolicy = await FixedCostPolicy.findOne({ messId }).lean();
  return sanitizePolicy(savedPolicy || DEFAULT_EQUAL_POLICY);
};

export const getPolicy = async (messId) => {
  return getCurrentPolicy(messId);
};

export const updatePolicy = async (messId, payload) => {
  const policyInput = normalizePolicyInput(payload);
  await validatePolicyResidentsBelongToMess(messId, policyInput);

  const policyData = {
    messId,
    ...policyInput,
  };

  const updatedPolicy = await FixedCostPolicy.findOneAndUpdate(
    { messId },
    { $set: policyData },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return sanitizePolicy(updatedPolicy.toObject ? updatedPolicy.toObject() : updatedPolicy);
};

export const previewFixedCostSplit = async (messId, billingPeriodId) => {
  const billingPeriod = await loadBillingPeriodAndEnsureScope(messId, billingPeriodId);
  const finalizedSplit = await getExistingFinalizedSplit(billingPeriodId, messId);
  if (finalizedSplit) {
    return finalizedSplit;
  }

  const eligibleResidents = await loadEligibleResidents(messId, billingPeriod);
  if (eligibleResidents.length === 0) {
    throw withStatus(400, 'No eligible residents are available for this billing period.');
  }

  const totalFixedCost = await getFixedCostTotalForBillingPeriod(billingPeriodId);
  const currentPolicy = await getCurrentPolicy(messId);
  const effectivePolicy = buildPolicyForResidents(currentPolicy, eligibleResidents);
  const residentIds = eligibleResidents.map((resident) => resident._id);

  let allocations;
  try {
    allocations = calculateFixedCostSplit({
      totalCost: totalFixedCost,
      residentIds,
      mode: effectivePolicy.mode,
      seatCounts: effectivePolicy.seatCounts,
      customPercentages: effectivePolicy.customPercentages,
    });
  } catch (error) {
    if (error instanceof FixedCostSplitValidationError) {
      throw withStatus(400, error.message);
    }
    throw error;
  }

  const result = {
    messId,
    billingPeriodId,
    totalFixedCost,
    policy: effectivePolicy,
    billingPeriod: {
      startDate: billingPeriod.startDate,
      endDate: billingPeriod.endDate,
    },
    residentAllocations: allocations.map((entry) => ({
      residentId: entry.residentId,
      amount: entry.amount,
      seatCount: effectivePolicy.mode === 'per_seat' ? Number(effectivePolicy.seatCounts[String(entry.residentId)] ?? 1) : undefined,
      percentageBasisPoints:
        effectivePolicy.mode === 'custom'
          ? Math.round(Number(effectivePolicy.customPercentages[String(entry.residentId)] ?? 0) * 100)
          : undefined,
    })),
    residentSnapshot: eligibleResidents.map((resident) => ({
      residentId: resident._id,
      joiningDate: resident.joiningDate,
      leavingDate: resident.leavingDate,
      userId: resident.userId,
      messId: resident.messId,
    })),
  };

  return result;
};

export const finalizeFixedCostSplit = async (messId, billingPeriodId) => {
  const billingPeriod = await loadBillingPeriodAndEnsureScope(messId, billingPeriodId);
  const currentSplit = await FixedCostSplit.findOne({ billingPeriodId });
  if (currentSplit) {
    throw withStatus(409, 'This billing period has already been finalized.');
  }

  const preview = await previewFixedCostSplit(messId, billingPeriodId);
  const snapshotDoc = {
    messId,
    billingPeriodId,
    totalFixedCost: preview.totalFixedCost,
    residentAllocations: preview.residentAllocations,
    policy: preview.policy,
    billingPeriod: preview.billingPeriod,
    residentSnapshot: preview.residentSnapshot,
  };

  try {
    const savedSplit = await FixedCostSplit.create(snapshotDoc);
    return savedSplit.toObject ? savedSplit.toObject() : savedSplit;
  } catch (error) {
    if (error?.code === 11000) {
      throw withStatus(409, 'This billing period has already been finalized by another request.');
    }
    throw error;
  }
};

export const getSavedSplits = async (messId, billingPeriodId) => {
  const filter = { messId };
  if (billingPeriodId) {
    if (!mongoose.Types.ObjectId.isValid(billingPeriodId)) {
      throw withStatus(400, 'Invalid billingPeriodId.');
    }
    filter.billingPeriodId = billingPeriodId;
  }

  const splits = await FixedCostSplit.find(filter).sort({ createdAt: -1 }).lean();
  return splits;
};
