const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.signAccess = (id) =>
  jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.ACCESS_TOKEN_TTL || '15m' });

// jti makes every refresh token unique, even if two are issued in the same second
exports.signRefresh = (id) =>
  jwt.sign({ id, jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_TTL || '7d',
  });

// Refresh tokens are stored hashed, so a database leak cannot be replayed
exports.hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
