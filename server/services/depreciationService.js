const decimalFraction = (value) => {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError('Depreciation inputs must be positive finite numbers');

  const match = String(value).toLowerCase().match(/^([+]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/);
  if (!match) throw new TypeError('Depreciation inputs must be positive finite numbers');

  const digits = BigInt(`${match[2]}${match[3] ?? ''}`);
  const scale = (match[3]?.length ?? 0) - Number(match[4] ?? 0);
  if (scale <= 0) return { numerator: digits * (10n ** BigInt(-scale)), denominator: 1n };
  return { numerator: digits, denominator: 10n ** BigInt(scale) };
};

const roundRatio = (numerator, denominator) => {
  const whole = numerator / denominator;
  const remainder = numerator % denominator;
  return remainder * 2n >= denominator ? whole + 1n : whole;
};

const toPoisha = (amount) => {
  const { numerator, denominator } = decimalFraction(amount);
  const poisha = roundRatio(numerator * 100n, denominator);
  if (poisha > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Depreciation amount exceeds the supported currency range');
  }
  return poisha;
};

export const calculateAnnualDepreciation = ({ purchasePrice, usefulLife, participants }) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    throw new TypeError('At least one participant is required');
  }

  const purchasePoisha = toPoisha(purchasePrice);
  const life = decimalFraction(usefulLife);
  const annualPoisha = roundRatio(purchasePoisha * life.denominator, life.numerator);
  if (annualPoisha > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Annual depreciation exceeds the supported currency range');
  }
  const sortedParticipants = [...participants].sort((left, right) => {
    const leftId = String(left.residentId);
    const rightId = String(right.residentId);
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
  const count = BigInt(sortedParticipants.length);
  const baseShare = annualPoisha / count;
  const remainder = annualPoisha % count;

  return {
    annualDepreciation: Number(annualPoisha) / 100,
    participants: sortedParticipants.map((participant, index) => {
      const sharePoisha = baseShare + (BigInt(index) < remainder ? 1n : 0n);
      return { ...participant, annualShare: Number(sharePoisha) / 100 };
    }),
  };
};
