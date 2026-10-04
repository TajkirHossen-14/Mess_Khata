import Mess from '../models/Mess.js';

const CHARACTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_ATTEMPTS = 10;

const generateCandidate = () => Array.from({ length: 6 }, () => (
  CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
)).join('');

const generateMessCode = async () => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = generateCandidate();
    const existingMess = await Mess.exists({ code });
    if (!existingMess) return code;
  }

  throw new Error('Unable to generate a unique mess code after 10 attempts');
};

export default generateMessCode;
