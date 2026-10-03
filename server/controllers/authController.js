import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { buildAuthPayload } from '../services/authService.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const authData = await buildAuthPayload(newUser._id);

    return res.status(201).json({
      success: true,
      data: authData,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const authData = await buildAuthPayload(user._id);

    return res.status(200).json({
      success: true,
      data: authData,
    });
  } catch (error) {
    return next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const authData = await buildAuthPayload(userId);

    return res.status(200).json({
      success: true,
      data: authData,
    });
  } catch (error) {
    return next(error);
  }
};

export default {
  register,
  login,
  me,
};
