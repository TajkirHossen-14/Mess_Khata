export function messScope(req, res, next) {
  if (!req.user || !req.user.messId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Mess scope required: user must be associated with a mess' 
    })
  }

  req.messId = req.user.messId
  next()
}