const role = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Access forbidden: insufficient permissions' });
  }
  next();
};

module.exports = role;