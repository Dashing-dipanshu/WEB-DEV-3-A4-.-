const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Chat = require('./models/Chat');

// userId -> Set of socket ids (a user can have several tabs/devices open)
const onlineUsers = new Map();

module.exports = function initSocket(io) {
  // Authenticate every socket with the same JWT access token used by the REST API
  io.use(async (socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(payload.id).select('name');
      if (!user) throw new Error('no user');
      socket.user = user;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const uid = String(socket.user._id);
    socket.join(`user:${uid}`); // personal room: lets the REST layer push events to this user

    const sockets = onlineUsers.get(uid) || new Set();
    sockets.add(socket.id);
    onlineUsers.set(uid, sockets);

    // First tab opened -> the user just came online
    if (sockets.size === 1) {
      await User.updateOne({ _id: uid }, { isOnline: true });
      io.emit('presence', { userId: uid, isOnline: true });
    }
    // Tell the newcomer who is already online
    socket.emit('presence:list', [...onlineUsers.keys()]);

    // Typing indicator: relayed only to the other members of that chat
    socket.on('typing', async ({ chatId, isTyping } = {}) => {
      try {
        if (!mongoose.isValidObjectId(chatId)) return;
        const chat = await Chat.findOne({ _id: chatId, members: uid }).select('members').lean();
        if (!chat) return;
        chat.members
          .filter((m) => String(m) !== uid)
          .forEach((m) =>
            io.to(`user:${m}`).emit('typing', { chatId, userId: uid, name: socket.user.name, isTyping: !!isTyping })
          );
      } catch (err) {
        console.error('typing handler error:', err.message);
      }
    });

    socket.on('disconnect', async () => {
      sockets.delete(socket.id);
      // Last tab closed -> the user went offline
      if (sockets.size === 0) {
        onlineUsers.delete(uid);
        const lastSeen = new Date();
        try {
          await User.updateOne({ _id: uid }, { isOnline: false, lastSeen });
        } catch (err) {
          console.error('presence update failed:', err.message);
        }
        io.emit('presence', { userId: uid, isOnline: false, lastSeen });
      }
    });
  });
};
