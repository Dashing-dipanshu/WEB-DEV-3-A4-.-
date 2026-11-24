const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('./error');

// Authentication: verifies the JWT access token and attaches req.user
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Not authenticated' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(401).json({ message: 'Token invalid or expired' });
  }

  // Load the user fresh so role changes by an admin apply immediately
  const user = await User.findById(payload.id);
  if (!user) return res.status(401).json({ message: 'User no longer exists' });

  req.user = user;
  next();
});

// Authorization (RBAC): requireRole('admin') guards admin routes
exports.requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: you do not have permission' });
  }
  next();
};
