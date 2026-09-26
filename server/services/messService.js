import Mess from '../models/Mess.js'
import generateMessCode from '../utils/generateMessCode.js'

export async function createMess(name, userId) {
  const code = await generateMessCode()
  const mess = await Mess.create({
    code,
    name,
    createdBy: userId
  })
  return mess
}