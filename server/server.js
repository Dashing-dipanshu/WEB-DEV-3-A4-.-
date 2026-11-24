require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const initSocket = require('./socket');
const User = require('./models/User');
const { notFound, errorHandler } = require('./middleware/error');

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  console.error('Missing JWT_ACCESS_SECRET / JWT_REFRESH_SECRET. Copy .env.example to .env and fill them in.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: CLIENT_URL, credentials: true } });
app.set('io', io); // routes use req.app.get('io') to push real-time events
initSocket(io);

// Minimal CORS (only needed when the client is hosted on a different origin)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', CLIENT_URL);
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', notFound);

// In production the same server also serves the built React app
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);

connectDB()
  .then(async () => {
    await User.updateMany({}, { isOnline: false }); // clean slate after a restart
    server.listen(PORT, () => console.log(`ChatBuddy server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
