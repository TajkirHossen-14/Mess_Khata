import Mess from '../models/Mess.js'

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6
const MAX_ATTEMPTS = 10

function generateCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length))
  }
  return code
}

export default async function generateMessCode() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const code = generateCode()
    const exists = await Mess.exists({ code })
    if (!exists) {
      return code
    }
  }
  throw new Error('Failed to generate unique mess code after 10 attempts')
}