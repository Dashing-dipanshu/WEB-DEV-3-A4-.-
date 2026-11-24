const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    // Users (other than the sender) who have opened the chat after this message was sent
    seenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Users who starred this message (stars are private to each user)
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

// Loading a chat's history (newest first, paginated)
messageSchema.index({ chat: 1, createdAt: -1 });
// Unread counts: (chat, sender, seenBy) lookups
messageSchema.index({ chat: 1, sender: 1 });
// Starred messages per user
messageSchema.index({ starredBy: 1 });
// UNIQUE TWIST: full-text index used to search inside a chat
messageSchema.index({ text: 'text' });

module.exports = mongoose.model('Message', messageSchema);
