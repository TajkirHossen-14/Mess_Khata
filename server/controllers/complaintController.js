import Complaint from '../models/Complaint.js';
import Resident from '../models/Resident.js';
import Manager from '../models/Manager.js';
import { createNotification } from '../services/notificationService.js';

const MANAGER_CAN_SEE_ANONYMOUS_IDENTITY = false;

const submitComplaint = async (req, res, next) => {
  try {
    const { content, isAnonymous = false } = req.body;
    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Complaint content is required' });
    }
    const resident = await Resident.findOne({ userId: req.user.id, messId: req.messId, leavingDate: null });
    if (!resident) {
      return res.status(403).json({ success: false, message: 'Only active residents can submit complaints' });
    }

    const complaint = await Complaint.create({
      residentId: resident._id,
      content: content.trim(),
      isAnonymous: Boolean(isAnonymous),
    });
    return res.status(201).json({ success: true, data: complaint });
  } catch (error) {
    return next(error);
  }
};

const getComplaints = async (req, res, next) => {
  try {
    const residents = await Resident.find({ messId: req.messId }).populate('userId', 'name');
    const residentIds = residents.map((r) => r._id);
    const residentMap = new Map(residents.map((r) => [r._id.toString(), r]));

    const query = { residentId: { $in: residentIds } };
    if (req.query.status && ['open', 'in_review', 'resolved'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const complaints = await Complaint.find(query).sort({ createdAt: -1 });

    const data = complaints.map((c) => {
      const resident = residentMap.get(c.residentId.toString());
      const isAnon = Boolean(c.isAnonymous);
      let submitter = null;
      if (!isAnon || MANAGER_CAN_SEE_ANONYMOUS_IDENTITY) {
        submitter = resident ? {
          residentId: resident._id.toString(),
          name: resident.userId?.name || 'Resident',
        } : null;
      }
      return {
        id: c._id.toString(),
        content: c.content,
        status: c.status,
        isAnonymous: isAnon,
        createdAt: c.createdAt,
        response: c.response || '',
        respondedAt: c.respondedAt || null,
        submitter,
      };
    });

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const resident = await Resident.findOne({ _id: complaint.residentId, messId: req.messId }).populate('userId', 'name');
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Complaint not found in this mess' });
    }

    const isAnon = Boolean(complaint.isAnonymous);
    let submitter = null;
    if (!isAnon || MANAGER_CAN_SEE_ANONYMOUS_IDENTITY) {
      submitter = {
        residentId: resident._id.toString(),
        name: resident.userId?.name || 'Resident',
      };
    }

    return res.json({
      success: true,
      data: {
        id: complaint._id.toString(),
        content: complaint.content,
        status: complaint.status,
        isAnonymous: isAnon,
        createdAt: complaint.createdAt,
        response: complaint.response || '',
        respondedAt: complaint.respondedAt || null,
        submitter,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateComplaint = async (req, res, next) => {
  try {
    const { status, response } = req.body;
    if (!status && response === undefined) {
      return res.status(400).json({ success: false, message: 'At least one of status or response is required' });
    }
    if (status && !['open', 'in_review', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be one of open, in_review, resolved' });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const resident = await Resident.findOne({ _id: complaint.residentId, messId: req.messId }).populate('userId', 'name');
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Complaint not found in this mess' });
    }

    let responseAdded = false;

    if (status) {
      complaint.status = status;
    }

    if (response !== undefined) {
      complaint.response = String(response).trim();
      const manager = await Manager.findOne({ userId: req.user.id, messId: req.messId });
      if (manager) {
        complaint.respondedBy = manager._id;
      }
      complaint.respondedAt = new Date();
      responseAdded = true;
    }

    await complaint.save();

    try {
      const recipientId = resident.userId?._id || resident.userId;
      const contentLine = `Your complaint status is now ${complaint.status}.${responseAdded ? ' A response was added.' : ''}`;
      await createNotification({
        recipientId,
        type: 'complaint',
        title: 'Your complaint was updated',
        content: contentLine,
        dedupeKey: `complaint:${complaint._id}:${Date.now()}`,
      });
    } catch (notifErr) {
      console.error('Failed to create complaint notification:', notifErr.message);
    }

    const isAnon = Boolean(complaint.isAnonymous);
    let submitter = null;
    if (!isAnon || MANAGER_CAN_SEE_ANONYMOUS_IDENTITY) {
      submitter = {
        residentId: resident._id.toString(),
        name: resident.userId?.name || 'Resident',
      };
    }

    return res.json({
      success: true,
      data: {
        id: complaint._id.toString(),
        content: complaint.content,
        status: complaint.status,
        isAnonymous: isAnon,
        createdAt: complaint.createdAt,
        response: complaint.response || '',
        respondedAt: complaint.respondedAt || null,
        submitter,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMyComplaints = async (req, res, next) => {
  try {
    const resident = await Resident.findOne({ userId: req.user.id, messId: req.messId });
    if (!resident) {
      return res.status(404).json({ success: false, message: 'Resident membership not found' });
    }

    const complaints = await Complaint.find({ residentId: resident._id }).sort({ createdAt: -1 });

    const data = complaints.map((c) => ({
      id: c._id.toString(),
      content: c.content,
      status: c.status,
      isAnonymous: Boolean(c.isAnonymous),
      createdAt: c.createdAt,
      response: c.response || '',
      respondedAt: c.respondedAt || null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

export {
  submitComplaint,
  getComplaints,
  getComplaintById,
  updateComplaint,
  getMyComplaints,
};
