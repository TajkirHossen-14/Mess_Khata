import Mess from '../models/Mess.js';
import Resident from '../models/Resident.js';
import Manager from '../models/Manager.js';
import { createMess as messServiceCreateMess } from '../services/messService.js';
import { buildAuthPayload } from '../services/authService.js';

export const createMess = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Mess name is required' });
    }

    if (req.user.messId) {
      return res.status(400).json({ success: false, message: "You're already part of a mess" });
    }

    const mess = await messServiceCreateMess(name, req.user.id);

    await Resident.create({
      userId: req.user.id,
      messId: mess._id,
      joiningDate: new Date(),
    });

    await Manager.create({
      userId: req.user.id,
      messId: mess._id,
    });

    const { token, user: userPayload } = await buildAuthPayload(req.user.id);

    res.status(201).json({
      success: true,
      data: { token, user: userPayload, mess },
    });
  } catch (error) {
    next(error);
  }
};

export const joinMess = async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Mess code is required' });
    }

    if (req.user.messId) {
      return res.status(400).json({ success: false, message: "You're already part of a mess" });
    }

    const upperCode = code.toUpperCase();
    const mess = await Mess.findOne({ code: upperCode });

    if (!mess) {
      return res.status(404).json({ success: false, message: 'Mess not found, check the code and try again' });
    }

    await Resident.create({
      userId: req.user.id,
      messId: mess._id,
      joiningDate: new Date(),
    });

    const { token, user: userPayload } = await buildAuthPayload(req.user.id);

    res.status(200).json({
      success: true,
      data: { token, user: userPayload, mess },
    });
  } catch (error) {
    next(error);
  }
};
