const requireRole = (...allowedRoles) => (req, res, next) => {
  const roles = req.user?.roles;
  if (!Array.isArray(roles) || !roles.some((role) => allowedRoles.includes(role))) {
    return res.status(403).json({ success: false, message: 'You do not have permission for this action' });
  }
  return next();
};

export default requireRole;
