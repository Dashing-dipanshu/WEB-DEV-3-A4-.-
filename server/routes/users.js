const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users?q=  - find classmates to start a chat with
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const filter = { _id: { $ne: req.user._id } };
    const q = (req.query.q || '').toString().trim().slice(0, 40);
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    const users = await User.find(filter).select('name email avatarColor isOnline lastSeen').sort({ name: 1 }).limit(20);
    res.json(users);
  })
);

module.exports = router;
