import User from '../models/User.js';
import Resident from '../models/Resident.js';
import Manager from '../models/Manager.js';
import { signToken } from '../utils/jwt.js';

export const buildAuthPayload = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  const [residentRecord, managerRecord] = await Promise.all([
    Resident.findOne({ userId }),
    Manager.findOne({ userId }),
  ]);

  const roles = [];
  let messId = null;

  if (residentRecord) {
    roles.push('resident');
    messId = residentRecord.messId;
  }

  if (managerRecord) {
    roles.push('manager');
    if (!messId) {
      messId = managerRecord.messId;
    }
  }

  const normalizedMessId = messId ? messId.toString() : null;
  const normalizedUserId = user._id.toString();

  const tokenPayload = {
    id: normalizedUserId,
    messId: normalizedMessId,
    roles,
  };

  const token = signToken(tokenPayload);

  return {
    token,
    user: {
      id: normalizedUserId,
      name: user.name,
      email: user.email,
      messId: normalizedMessId,
      roles,
    },
  };
};

export default { buildAuthPayload };
