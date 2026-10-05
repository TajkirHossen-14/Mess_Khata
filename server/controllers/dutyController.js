import DutyAssignment from '../models/DutyAssignment.js';
import Resident from '../models/Resident.js';

const dutyTypes = ['bazar', 'cleaning', 'washroom'];
const statuses = ['assigned', 'completed', 'cancelled'];

const assignDuty = async (req, res, next) => {
  try {
    const { residentId, type, date } = req.body;
    if (!residentId || !dutyTypes.includes(type) || !date) return res.status(400).json({ success: false, message: 'A valid resident, duty type, and date are required' });
    const resident = await Resident.findOne({ _id: residentId, messId: req.messId, leavingDate: null });
    if (!resident) return res.status(400).json({ success: false, message: 'Resident does not belong to your mess' });
    const duty = await DutyAssignment.create({ messId: req.messId, residentId, type, date });
    return res.status(201).json({ success: true, data: duty });
  } catch (error) {
    return next(error);
  }
};

const getAllDuties = async (req, res, next) => {
  try {
    const query = { messId: req.messId };
    if (req.query.date) query.date = new Date(req.query.date);
    if (req.query.startDate || req.query.endDate) {
      query.date = {};
      if (req.query.startDate) query.date.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.date.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
    }
    const duties = await DutyAssignment.find(query).sort({ date: 1 }).populate({ path: 'residentId', populate: { path: 'userId', select: 'name email' } });
    return res.json({ success: true, data: duties });
  } catch (error) {
    return next(error);
  }
};

const getMessResidents = async (req, res, next) => {
  try {
    const residents = await Resident.find({ messId: req.messId, leavingDate: null }).populate('userId', 'name email');
    return res.json({ success: true, data: residents });
  } catch (error) {
    return next(error);
  }
};

const getMyDuties = async (req, res, next) => {
  try {
    const resident = await Resident.findOne({ userId: req.user.id, messId: req.messId, leavingDate: null });
    if (!resident) return res.status(403).json({ success: false, message: 'Only active residents can view duty assignments' });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const duties = await DutyAssignment.find({ residentId: resident.id, date: { $gte: today }, status: 'assigned' }).sort({ date: 1 });
    return res.json({ success: true, data: duties });
  } catch (error) {
    return next(error);
  }
};

const updateDutyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!statuses.includes(status)) return res.status(400).json({ success: false, message: 'Invalid duty status' });
    const duty = await DutyAssignment.findOneAndUpdate({ _id: req.params.id, messId: req.messId }, { status }, { new: true });
    if (!duty) return res.status(404).json({ success: false, message: 'Duty assignment not found' });
    return res.json({ success: true, data: duty });
  } catch (error) {
    return next(error);
  }
};

export { assignDuty, getAllDuties, getMessResidents, getMyDuties, updateDutyStatus };
