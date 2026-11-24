const express = require('express');
const mongoose = require('mongoose');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const { emitToUsers } = require('../utils/emit');

const router = express.Router();
const SENDER_FIELDS = 'name avatarColor';

// Only members of a chat may read or write its messages
const loadChat = asyncHandler(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.chatId)) return res.status(400).json({ message: 'Invalid chat id' });
  const chat = await Chat.findOne({ _id: req.params.chatId, members: req.user._id });
  if (!chat) return res.status(404).json({ message: 'Chat not found' });
  req.chat = chat;
  next();
});

// GET /api/messages/starred?chat=<chatId>  - my starred messages (optionally for one chat)
// (declared before the /:id routes so "starred" is not read as an id)
router.get(
  '/starred',
  protect,
  asyncHandler(async (req, res) => {
    const filter = { starredBy: req.user._id };
    if (req.query.chat) {
      if (!mongoose.isValidObjectId(req.query.chat)) return res.status(400).json({ message: 'Invalid chat id' });
      filter.chat = req.query.chat;
    }
    // Never return starred messages from chats I am no longer a member of
    const myChats = await Chat.find({ members: req.user._id }).select('_id').lean();
    filter.chat = filter.chat
      ? myChats.some((c) => String(c._id) === String(filter.chat)) ? filter.chat : null
      : { $in: myChats.map((c) => c._id) };
    if (filter.chat === null) return res.json([]);

    const messages = await Message.find(filter).sort({ createdAt: -1 }).limit(100).populate('sender', SENDER_FIELDS).lean();
    res.json(messages);
  })
);

// GET /api/messages/chat/:chatId?before=<iso>&limit=30  - paginated history (oldest -> newest)
router.get(
  '/chat/:chatId',
  protect,
  loadChat,
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const filter = { chat: req.chat._id };
    if (req.query.before) {
      const d = new Date(req.query.before);
      if (!isNaN(d)) filter.createdAt = { $lt: d };
    }
    const docs = await Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1).populate('sender', SENDER_FIELDS).lean();
    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();
    res.json({ messages: docs.reverse(), hasMore });
  })
);

// GET /api/messages/chat/:chatId/search?q=  - UNIQUE TWIST: MongoDB text index search
router.get(
  '/chat/:chatId/search',
  protect,
  loadChat,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toString().trim().slice(0, 100);
    if (q.length < 2) return res.json([]);
    const results = await Message.find({ chat: req.chat._id, $text: { $search: q } })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', SENDER_FIELDS)
      .lean();
    res.json(results);
  })
);

// POST /api/messages/chat/:chatId  { text }  - send a message
router.post(
  '/chat/:chatId',
  protect,
  loadChat,
  asyncHandler(async (req, res) => {
    const text = (req.body?.text || '').toString().trim();
    if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
    if (text.length > 2000) return res.status(400).json({ message: 'Message is too long (max 2000 characters)' });

    let message = await Message.create({ chat: req.chat._id, sender: req.user._id, text });
    await Chat.updateOne({ _id: req.chat._id }, { lastMessage: message._id }); // also bumps updatedAt
    message = await message.populate('sender', SENDER_FIELDS);

    const payload = message.toObject();
    // Real-time delivery to every member (including the sender's other tabs)
    emitToUsers(req.app.get('io'), req.chat.members, 'message:new', payload);
    res.status(201).json(payload);
  })
);

// PATCH /api/messages/chat/:chatId/seen  - called when the receiver opens the chat
router.patch(
  '/chat/:chatId/seen',
  protect,
  loadChat,
  asyncHandler(async (req, res) => {
    const result = await Message.updateMany(
      { chat: req.chat._id, sender: { $ne: req.user._id }, seenBy: { $ne: req.user._id } },
      { $addToSet: { seenBy: req.user._id } }
    );
    if (result.modifiedCount > 0) {
      emitToUsers(req.app.get('io'), req.chat.members, 'messages:seen', {
        chatId: String(req.chat._id),
        userId: String(req.user._id),
      });
    }
    res.json({ updated: result.modifiedCount });
  })
);

// POST /api/messages/:id/star  - toggle star on a message
router.post(
  '/:id/star',
  protect,
  asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid message id' });
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (!(await Chat.exists({ _id: message.chat, members: req.user._id }))) {
      return res.status(403).json({ message: 'You are not a member of this chat' });
    }

    const starred = !message.starredBy.some((id) => id.equals(req.user._id));
    const updated = await Message.findByIdAndUpdate(
      message._id,
      starred ? { $addToSet: { starredBy: req.user._id } } : { $pull: { starredBy: req.user._id } },
      { new: true }
    );
    res.json({ _id: updated._id, starred, starredBy: updated.starredBy });
  })
);

module.exports = router;
