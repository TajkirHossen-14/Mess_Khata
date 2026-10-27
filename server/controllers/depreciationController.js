import mongoose from 'mongoose';
import Resident from '../models/Resident.js';
import ResidentSharedAsset from '../models/ResidentSharedAsset.js';
import SharedAsset from '../models/SharedAsset.js';
import { calculateAnnualDepreciation } from '../services/depreciationService.js';

export const getSharedAssetDepreciation = async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid shared asset ID' });
  }
  if (!req.messId) {
    return res.status(400).json({ success: false, message: 'Mess context is required' });
  }

  try {
    const asset = await SharedAsset.findOne({ _id: id, messId: req.messId });
    if (!asset) {
      return res.status(404).json({ success: false, message: 'Shared asset not found' });
    }

    const links = await ResidentSharedAsset.find({ sharedAssetId: asset._id }).sort({ residentId: 1 });

    if (links.length === 0) {
      return res.status(400).json({ success: false, message: 'Shared asset has no participants' });
    }

    const residentIds = links.map(({ residentId }) => residentId?._id ?? residentId);
    const residents = await Resident.find({ _id: { $in: residentIds } })
      .select('_id messId userId');
    const residentRecordsById = new Map(residents.map((resident) => [String(resident._id), resident]));
    const linkedIds = residentIds.map(String);
    const linkedIdsAreUnique = new Set(linkedIds).size === linkedIds.length;
    const allParticipantsBelongToAssetMess = linkedIdsAreUnique && linkedIds.every((residentId) => {
      const resident = residentRecordsById.get(residentId);
      return resident && String(resident.messId) === String(asset.messId);
    });

    if (!allParticipantsBelongToAssetMess) {
      return res.status(409).json({
        success: false,
        message: 'Shared asset participant records are inconsistent',
      });
    }

    const residentsWithUsers = await Resident.populate(residents, {
      path: 'userId',
      select: 'name email',
    });
    const residentsById = new Map(residentsWithUsers.map((resident) => [String(resident._id), resident]));

    const calculation = calculateAnnualDepreciation({
      purchasePrice: asset.purchasePrice,
      usefulLife: asset.usefulLife,
      participants: residentIds.map((residentId) => {
        const resident = residentsById.get(String(residentId));
        return {
          residentId: resident._id,
          name: resident.userId?.name ?? 'Resident',
          email: resident.userId?.email,
        };
      }),
    });

    return res.status(200).json({
      success: true,
      data: {
        assetId: asset._id,
        annualDepreciation: calculation.annualDepreciation,
        usefulLife: asset.usefulLife,
        participants: calculation.participants,
      },
    });
  } catch (error) {
    return next(error);
  }
};
