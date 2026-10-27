import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import ResidentSharedAsset from '../models/ResidentSharedAsset.js';
import SharedAsset from '../models/SharedAsset.js';

const badRequest = (res, message) => res.status(400).json({ success: false, message });

const validatePositiveNumber = (value, label) => {
  if (value === '' || value === null || value === undefined || !['number', 'string'].includes(typeof value)) {
    return { error: `${label} must be a positive finite number` };
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return { error: `${label} must be a positive finite number` };
  }
  return { value: number };
};

export const createSharedAsset = async (req, res, next) => {
  const body = req.body ?? {};
  const validated = validateSharedAssetInput(body);
  if (validated.error) return badRequest(res, validated.error);

  const { name, purchasePrice, purchaseDate, usefulLife } = validated.value;
  if (!req.messId) return badRequest(res, 'Mess context is required');

  try {
    const residents = await Resident.find({
      _id: { $in: body.participantIds },
      messId: req.messId,
      leavingDate: null,
    }).populate('userId', 'name email');

    if (residents.length !== body.participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants are unavailable or do not belong to this mess',
      });
    }

    const asset = await SharedAsset.create({
      messId: req.messId,
      name,
      purchasePrice,
      purchaseDate,
      usefulLife,
    });

    try {
      await ResidentSharedAsset.insertMany(body.participantIds.map((residentId) => ({
        residentId,
        sharedAssetId: asset._id,
      })));
    } catch (linkError) {
      try {
        await ResidentSharedAsset.deleteMany({ sharedAssetId: asset._id });
        await SharedAsset.deleteOne({ _id: asset._id });
      } catch (rollbackError) {
        rollbackError.cause = linkError;
        return next(rollbackError);
      }
      throw linkError;
    }

    return res.status(201).json({
      success: true,
      data: {
        asset,
        participants: residents.map((resident) => ({
          id: resident._id,
          name: resident.userId?.name ?? 'Resident',
          email: resident.userId?.email,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const validateSharedAssetInput = (body) => {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { error: 'Asset name is required' };

  const purchasePrice = validatePositiveNumber(body.purchasePrice, 'Purchase price');
  if (purchasePrice.error) return purchasePrice;
  const usefulLife = validatePositiveNumber(body.usefulLife, 'Useful life');
  if (usefulLife.error) return usefulLife;

  if (body.purchaseDate === undefined || body.purchaseDate === null || body.purchaseDate === '') {
    return { error: 'Purchase date is required' };
  }
  if (typeof body.purchaseDate !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(body.purchaseDate)) {
    return { error: 'Purchase date must be a valid date' };
  }
  const purchaseDate = new Date(body.purchaseDate);
  if (!Number.isFinite(purchaseDate.getTime())) return { error: 'Purchase date must be a valid date' };
  const dateOnly = body.purchaseDate.slice(0, 10);
  const [year, month, day] = dateOnly.split('-').map(Number);
  const checkedDate = new Date(Date.UTC(year, month - 1, day));
  if (checkedDate.getUTCFullYear() !== year || checkedDate.getUTCMonth() !== month - 1 || checkedDate.getUTCDate() !== day) {
    return { error: 'Purchase date must be a valid date' };
  }

  if (!Array.isArray(body.participantIds) || body.participantIds.length === 0) {
    return { error: 'At least one participant is required' };
  }
  if (body.participantIds.some((id) => typeof id !== 'string' || !mongoose.isValidObjectId(id))) {
    return { error: 'Every participant ID must be a valid resident ID' };
  }
  const normalizedParticipantIds = body.participantIds.map((id) => id.toLowerCase());
  if (new Set(normalizedParticipantIds).size !== normalizedParticipantIds.length) {
    return { error: 'Participant IDs must not contain duplicates' };
  }

  return {
    value: {
      name,
      purchasePrice: purchasePrice.value,
      purchaseDate,
      usefulLife: usefulLife.value,
    },
  };
};

export const getMessResidents = async (req, res, next) => {
  if (!req.messId) return badRequest(res, 'Mess context is required');
  try {
    const residents = await Resident.find({ messId: req.messId, leavingDate: null })
      .populate('userId', 'name email')
      .sort({ _id: 1 });
    return res.status(200).json({
      success: true,
      data: residents.map((resident) => ({
        id: resident._id,
        name: resident.userId?.name ?? 'Resident',
        email: resident.userId?.email,
      })),
    });
  } catch (error) {
    return next(error);
  }
};
