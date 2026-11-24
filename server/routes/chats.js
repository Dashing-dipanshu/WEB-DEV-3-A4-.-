const express = require('express');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { emitToUsers } = require('../utils/emit');

const router = express.Router();
const MEMBER_FIELDS = 'name email avatarColor isOnline lastSeen';
const LAST_MESSAGE_FIELDS = 'text sender createdAt seenBy';

const populateChat = async (id) => {
  const chat = await Chat.findById(id)
    .populate('members', MEMBER_FIELDS)
    .populate('lastMessage', LAST_MESSAGE_FIELDS)
    .lean();
  return { ...chat, unreadCount: 0 };
};

// GET /api/chats  - my chats (newest activity first) with unread counts
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const me = req.user._id;
    const chats = await Chat.find({ members: me })
      .populate('members', MEMBER_FIELDS)
      .populate('lastMessage', LAST_MESSAGE_FIELDS)
      .sort({ updatedAt: -1 })
      .lean();

    // Unread count per chat, computed in ONE aggregation:
    // messages in my chats, not sent by me, that I have not seen yet -> grouped by chat
    const counts = await Message.aggregate([
      { $match: { chat: { $in: chats.map((c) => c._id) }, sender: { $ne: me }, seenBy: { $ne: me } } },
      { $group: { _id: '$chat', count: { $sum: 1 } } },
    ]);
    const unread = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    res.json(chats.map((c) => ({ ...c, unreadCount: unread[String(c._id)] || 0 })));
  })
);

// POST /api/chats  { userId }  - open (or create) a one-to-one chat
router.post(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    if (!mongoose.isValidObjectId(userId) || String(userId) === String(req.user._id)) {
      return res.status(400).json({ message: 'Choose another user to chat with' });
    }
    const other = await User.findById(userId);
    if (!other) return res.status(404).json({ message: 'User not found' });

    let chat = await Chat.findOne({ isGroup: false, members: { $all: [req.user._id, other._id], $size: 2 } });
    const created = !chat;
    if (!chat) chat = await Chat.create({ members: [req.user._id, other._id] });

    const full = await populateChat(chat._id);
    if (created) emitToUsers(req.app.get('io'), [other._id], 'chat:new', full);
    res.status(created ? 201 : 200).json(full);
  })
);

// POST /api/chats/group  { name, memberIds }
router.post(
  '/group',
  protect,
  asyncHandler(async (req, res) => {
    const name = (req.body?.name || '').toString().trim();
    const ids = [...new Set((req.body?.memberIds || []).map(String))].filter(
      (id) => mongoose.isValidObjectId(id) && id !== String(req.user._id)
    );
    if (name.length < 2) return res.status(400).json({ message: 'Group name must be at least 2 characters' });
    if (ids.length < 1) return res.status(400).json({ message: 'Add at least one member to the group' });
    if ((await User.countDocuments({ _id: { $in: ids } })) !== ids.length) {
      return res.status(404).json({ message: 'One or more members do not exist' });
    }

    const chat = await Chat.create({ isGroup: true, name, members: [req.user._id, ...ids], groupAdmin: req.user._id });
    const full = await populateChat(chat._id);
    emitToUsers(req.app.get('io'), ids, 'chat:new', full);
    res.status(201).json(full);
  })
);

module.exports = router;
