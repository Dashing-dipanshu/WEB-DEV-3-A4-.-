const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');

const router = express.Router();

// Every route below needs a valid token AND the "admin" role (RBAC)
router.use(protect, requireRole('admin'));

// GET /api/admin/stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const [users, online, chats, groups, messages] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isOnline: true }),
      Chat.countDocuments(),
      Chat.countDocuments({ isGroup: true }),
      Message.countDocuments(),
    ]);
    res.json({ users, online, chats, groups, messages });
  })
);

// GET /api/admin/users
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    res.json(await User.find().select('name email role avatarColor isOnline lastSeen createdAt').sort({ createdAt: -1 }));
  })
);

// PATCH /api/admin/users/:id/role  { role }
router.patch(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role must be "user" or "admin"' });
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('name email role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  })
);

// DELETE /api/admin/users/:id
router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user id' });
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Clean up: remove from chats, then delete chats that no longer have 2+ members (and their messages)
    await Chat.updateMany({ members: user._id }, { $pull: { members: user._id } });
    const dead = await Chat.find({ $expr: { $lt: [{ $size: '$members' }, 2] } }).select('_id');
    if (dead.length) {
      const ids = dead.map((c) => c._id);
      await Message.deleteMany({ chat: { $in: ids } });
      await Chat.deleteMany({ _id: { $in: ids } });
    }
    res.json({ message: 'User deleted' });
  })
);

module.exports = router;
