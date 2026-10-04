import Mess from '../models/Mess.js';
import generateMessCode from '../utils/generateMessCode.js';

const createMess = async (name, userId) => {
  const code = await generateMessCode();
  return Mess.create({ code, name, createdBy: userId });
};

export { createMess };
