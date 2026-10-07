import Complaint from '../models/Complaint.js';
import Resident from '../models/Resident.js';

const submitComplaint = async (req, res, next) => {
  try {
    const { content, isAnonymous = false } = req.body;
    if (!content?.trim()) return res.status(400).json({ success: false, message: 'Complaint content is required' });
    const resident = await Resident.findOne({ userId: req.user.id, messId: req.messId, leavingDate: null });
    if (!resident) return res.status(403).json({ success: false, message: 'Only active residents can submit complaints' });

    const complaint = await Complaint.create({ residentId: resident.id, content: content.trim(), isAnonymous: Boolean(isAnonymous) });
    return res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    return next(error);
  }
};

export { submitComplaint };
