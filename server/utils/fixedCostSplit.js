const INVALID_RESIDENT_ID_MESSAGE = 'Resident ID values must be valid IDs and cannot be duplicated.';
const INVALID_MODE_MESSAGE = 'Unsupported sharing mode.';

export class FixedCostSplitValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FixedCostSplitValidationError';
  }
}

const toSafeInteger = (value, { minimum = 0, allowZero = true, label = 'value' } = {}) => {
  if (value === null || value === undefined || value === '') {
    throw new FixedCostSplitValidationError(`${label} is required.`);
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || !Number.isSafeInteger(numeric)) {
    throw new FixedCostSplitValidationError(`${label} must be a safe integer.`);
  }

  if (numeric < minimum || (!allowZero && numeric === 0)) {
    throw new FixedCostSplitValidationError(`${label} must be ${allowZero ? 'at least' : 'greater than'} ${minimum}.`);
  }

  return numeric;
};

const normalizeResidentKey = (residentId) => {
  if (residentId === null || residentId === undefined || residentId === '') {
    throw new FixedCostSplitValidationError(INVALID_RESIDENT_ID_MESSAGE);
  }

  const key = String(residentId);
  if (!key || key === 'null' || key === 'undefined') {
    throw new FixedCostSplitValidationError(INVALID_RESIDENT_ID_MESSAGE);
  }

  return key;
};

const parsePercentBasisPoints = (value, residentId) => {
  if (value === null || value === undefined || value === '') {
    throw new FixedCostSplitValidationError(`Custom percentage for resident ${residentId} is required.`);
  }

  const text = String(value).trim();
  if (!/^(?:\d+|\d+\.\d{1,2})$/.test(text)) {
    throw new FixedCostSplitValidationError(`Custom percentage for resident ${residentId} must have at most two decimal places.`);
  }

  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
    throw new FixedCostSplitValidationError(`Custom percentage for resident ${residentId} must be between 0 and 100.`);
  }

  const basisPoints = Math.round(numeric * 100);
  if (!Number.isSafeInteger(basisPoints)) {
    throw new FixedCostSplitValidationError(`Custom percentage for resident ${residentId} exceeds JavaScript safe-integer limits.`);
  }

  return basisPoints;
};

const allocateLargestRemainder = (totalCost, weights, residentIds) => {
  const residentOrder = residentIds.map(normalizeResidentKey);
  const uniqueResidents = new Set(residentOrder);
  if (uniqueResidents.size !== residentOrder.length) {
    throw new FixedCostSplitValidationError(INVALID_RESIDENT_ID_MESSAGE);
  }

  if (totalCost === 0) {
    return residentOrder.map((residentId) => ({ residentId, amount: 0 }));
  }

  if (residentOrder.length === 0) {
    throw new FixedCostSplitValidationError('At least one resident is required to allocate a non-zero total cost.');
  }

  const totalWeight = weights.reduce((sum, weight) => sum + BigInt(weight), 0n);
  if (totalWeight === 0n) {
    throw new FixedCostSplitValidationError('The total weight for the selected residents cannot be zero.');
  }

  const assigned = residentOrder.map((residentId, index) => {
    const numerator = BigInt(totalCost) * BigInt(weights[index]);
    const share = numerator / totalWeight;
    const remainder = numerator % totalWeight;
    return {
      residentId,
      share: Number(share),
      remainder,
    };
  });

  const remainderTotal = totalCost - assigned.reduce((sum, item) => sum + item.share, 0);
  if (remainderTotal < 0) {
    throw new Error('Allocation failed because the remainder total was negative.');
  }

  const orderedByRemainder = [...assigned].sort((left, right) => {
    if (right.remainder !== left.remainder) {
      return right.remainder > left.remainder ? 1 : -1;
    }
    if (left.residentId < right.residentId) return -1;
    if (left.residentId > right.residentId) return 1;
    return 0;
  });

  for (let index = 0; index < remainderTotal; index += 1) {
    const winner = orderedByRemainder[index];
    if (!winner) {
      break;
    }

    const record = assigned.find((entry) => entry.residentId === winner.residentId);
    if (record) {
      record.share += 1;
    }
  }

  return residentOrder.map((residentId) => {
    const record = assigned.find((entry) => entry.residentId === residentId);
    if (!record) {
      throw new Error('Allocation failed while preserving resident order.');
    }

    return {
      residentId,
      amount: Number(record.share),
    };
  });
};

const calculateEqualWeights = (residentIds) => residentIds.map(() => 1);

const calculateSeatWeights = (residentIds, seatCounts) => residentIds.map((residentId) => {
  const key = normalizeResidentKey(residentId);
  const rawSeatCount = seatCounts[key] ?? seatCounts[String(residentId)] ?? 1;
  const seatCount = toSafeInteger(rawSeatCount, { minimum: 1, allowZero: false, label: `Seat count for resident ${key}` });
  return seatCount;
});

const calculateCustomWeights = (residentIds, customPercentages) => {
  const residentSet = new Set(residentIds.map(normalizeResidentKey));
  const customKeys = Object.keys(customPercentages).map(normalizeResidentKey);
  const unexpectedResidentIds = customKeys.filter((residentId) => !residentSet.has(residentId));
  if (unexpectedResidentIds.length > 0) {
    throw new FixedCostSplitValidationError(`Unexpected resident IDs in custom percentages: ${unexpectedResidentIds.join(', ')}.`);
  }

  const weights = residentIds.map((residentId) => {
    const key = normalizeResidentKey(residentId);
    if (!(key in customPercentages)) {
      throw new FixedCostSplitValidationError(`Custom percentage missing for resident ${key}.`);
    }

    return parsePercentBasisPoints(customPercentages[key] ?? customPercentages[String(residentId)], key);
  });

  const totalBasisPoints = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalBasisPoints !== 10000) {
    throw new FixedCostSplitValidationError('Custom percentages must total exactly 100%.');
  }

  return weights;
};

export function calculateFixedCostSplit({
  totalCost,
  residentIds,
  mode = 'equal',
  seatCounts = {},
  customPercentages = {},
}) {
  if (!Array.isArray(residentIds)) {
    throw new FixedCostSplitValidationError('Resident IDs must be provided as an array.');
  }

  if (residentIds.length === 0) {
    const normalizedTotal = toSafeInteger(totalCost, { minimum: 0, allowZero: true, label: 'Total cost' });
    if (normalizedTotal !== 0) {
      throw new FixedCostSplitValidationError('A non-zero total cost cannot be distributed across zero residents.');
    }
    return [];
  }

  const normalizedTotalCost = toSafeInteger(totalCost, { minimum: 0, allowZero: true, label: 'Total cost' });
  const normalizedResidentIds = residentIds.map(normalizeResidentKey);

  if (normalizedResidentIds.length !== new Set(normalizedResidentIds).size) {
    throw new FixedCostSplitValidationError(INVALID_RESIDENT_ID_MESSAGE);
  }

  let weights = [];
  if (mode === 'equal') {
    weights = calculateEqualWeights(normalizedResidentIds);
  } else if (mode === 'per_seat') {
    weights = calculateSeatWeights(normalizedResidentIds, seatCounts ?? {});
  } else if (mode === 'custom') {
    weights = calculateCustomWeights(normalizedResidentIds, customPercentages ?? {});
  } else {
    throw new FixedCostSplitValidationError(INVALID_MODE_MESSAGE);
  }

  return allocateLargestRemainder(normalizedTotalCost, weights, normalizedResidentIds);
}

export const DEFAULT_EQUAL_POLICY = {
  mode: 'equal',
  seatCounts: {},
  customPercentages: {},
};

export const SUPPORTED_POLICY_MODES = ['equal', 'per_seat', 'custom'];
