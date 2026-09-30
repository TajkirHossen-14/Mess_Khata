const messScope = (req, res, next) => {
  if (!req.user?.messId) {
    return res.status(400).json({ success: false, message: 'Mess context is required' });
  }
  req.messId = req.user.messId;
  return next();
};

export default messScope;
