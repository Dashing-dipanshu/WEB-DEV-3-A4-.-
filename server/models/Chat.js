const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 40 }, // only for group chats
    members: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      validate: [(v) => v.length >= 2, 'A chat needs at least 2 members'],
    },
    groupAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  },
  { timestamps: true }
);

// "my chats, newest activity first" and "find the existing 1:1 chat"
chatSchema.index({ members: 1, updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
