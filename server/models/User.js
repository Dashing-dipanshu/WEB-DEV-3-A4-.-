const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const AVATAR_COLORS = ['#0b8f6a', '#2f80ed', '#9b51e0', '#e0524f', '#e8871e', '#00a3a3', '#d6336c', '#5f6caf'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, minlength: [2, 'Name must be at least 2 characters'], maxlength: 40 },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: [6, 'Password must be at least 6 characters'], select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }, // RBAC
    avatarColor: { type: String, default: () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)] },
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    // SHA-256 hashes of the user's active refresh tokens (max 5 devices)
    refreshTokens: { type: [String], select: false, default: [] },
  },
  { timestamps: true }
);

// Hash the password only when it was set/changed
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function () {
  return { _id: this._id, name: this.name, email: this.email, role: this.role, avatarColor: this.avatarColor };
};

module.exports = mongoose.model('User', userSchema);
