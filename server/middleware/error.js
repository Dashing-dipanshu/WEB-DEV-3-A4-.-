// Wraps async route handlers so rejected promises reach the error handler
exports.asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

exports.notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  if (err.code === 11000) return res.status(409).json({ message: 'This email is already registered' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid id' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
};
