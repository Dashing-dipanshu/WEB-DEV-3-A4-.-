const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { signAccess, signRefresh, hashToken } = require('../utils/tokens');

const router = express.Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates a new access + refresh pair and remembers the refresh hash (max 5 sessions)
async function issueTokens(userId) {
  const accessToken = signAccess(userId);
  const refreshToken = signRefresh(userId);
  await User.updateOne(
    { _id: userId },
    { $push: { refreshTokens: { $each: [hashToken(refreshToken)], $slice: -5 } } }
  );
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password are required' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: 'Please enter a valid email' });
    if (await User.exists({ email: email.toLowerCase().trim() })) {
      return res.status(409).json({ message: 'This email is already registered' });
    }

    // role is never taken from the request body: everyone registers as a normal user
    const user = await User.create({ name, email, password });
    const tokens = await issueTokens(user._id);
    res.status(201).json({ user: user.toPublic(), ...tokens });
  })
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const tokens = await issueTokens(user._id);
    res.json({ user: user.toPublic(), ...tokens });
  })
);

// POST /api/auth/refresh  - rotates the refresh token (old one stops working)
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(401).json({ message: 'Refresh token missing' });

    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ message: 'Refresh token invalid or expired' });
    }

    const oldHash = hashToken(refreshToken);
    const user = await User.findOne({ _id: payload.id, refreshTokens: oldHash });
    if (!user) return res.status(401).json({ message: 'Refresh token has been revoked' });

    await User.updateOne({ _id: user._id }, { $pull: { refreshTokens: oldHash } });
    const tokens = await issueTokens(user._id);
    res.json({ user: user.toPublic(), ...tokens });
  })
);

// POST /api/auth/logout  - revokes the given refresh token
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (refreshToken) {
      await User.updateOne({ refreshTokens: hashToken(refreshToken) }, { $pull: { refreshTokens: hashToken(refreshToken) } });
    }
    res.json({ message: 'Logged out' });
  })
);

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user.toPublic() }));

module.exports = router;
