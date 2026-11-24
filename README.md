# 💬 ChatBuddy – WhatsApp Clone

A real-time chat app for private and group conversations where classmates can see who is online and whether a message was read. Built with the **MERN stack + Socket.IO** as a Web Development capstone project.

| | |
|---|---|
| **Frontend** | React 18, react-router-dom, Fetch API, Context API, socket.io-client (built with Vite) |
| **Backend** | Node.js, Express, Mongoose, dotenv, bcrypt, jsonwebtoken, socket.io |
| **Database** | MongoDB (collections: `User`, `Chat`, `Message`) |
| **User roles** | `user`, `admin` |

---

## ✨ Features

| Requirement | How it is implemented |
|---|---|
| **Register / login with JWT access + refresh tokens** | Short-lived access token (15 min) + long-lived refresh token (7 days). The refresh token is **rotated** on every refresh and only its **SHA-256 hash** is stored in MongoDB, so a stolen database cannot be replayed. The React `api.js` wrapper silently refreshes on a `401` and retries the request. |
| **Passwords hashed with bcrypt** | `pre('save')` hook in `models/User.js` (10 salt rounds). The password field is `select: false`, so it never leaves the database by accident. |
| **Roles: user and admin (RBAC)** | `requireRole('admin')` middleware guards every `/api/admin/*` route. The role is read from the database on each request, so a demotion applies instantly. On the client, `<ProtectedRoute roles={['admin']}>` guards the admin page. Nobody can self-register as admin. |
| **One-to-one and group chats** | `Chat` has `isGroup`, `members[]`, `groupAdmin`. Opening a 1:1 chat finds the existing one (`$all` + `$size: 2`) or creates it. |
| **Messages saved in MongoDB, loaded when a chat opens** | `Message` collection, paginated history (`before` cursor, "Load earlier messages"). |
| **Online / offline status and typing indicator** | Socket.IO presence map (userId → sockets, so multiple tabs work) + `isOnline` / `lastSeen` stored on the user. Typing events are relayed only to the other members of that chat. |
| **Sent and seen ticks** | ✓ = sent, ✓✓ (blue) = seen. When the receiver opens the chat, `PATCH /messages/chat/:id/seen` adds them to `seenBy`, and the sender's screen updates live via `messages:seen`. In groups, ✓✓ means *everyone* has seen it (hover shows "Seen by 2 of 3"). |
| **Unread count per chat using aggregation** | `GET /api/chats` runs one `Message.aggregate([{ $match }, { $group }])` for all chats at once. |
| **⭐ Unique Twist: starred messages + search in a chat** | Stars are private per user (`starredBy[]`). Search uses a MongoDB **text index** (`messageSchema.index({ text: 'text' })`) with `$text: { $search }`; matches are highlighted in the UI. |

**Extras:** dark/light theme, responsive (mobile shows one pane at a time), admin dashboard with stats, role switching and user deletion, auto-resync after a dropped connection.

---

## 🗂️ Project structure

```
chatbuddy/
├── server/
│   ├── server.js            # Express + HTTP server + Socket.IO bootstrap
│   ├── socket.js            # socket auth, presence, typing
│   ├── seed.js              # creates the admin (and optional demo users)
│   ├── config/db.js
│   ├── models/              # User.js  Chat.js  Message.js
│   ├── middleware/          # auth.js (protect, requireRole)  error.js
│   ├── routes/              # auth  users  chats  messages  admin
│   └── utils/               # tokens.js  emit.js
└── client/
    ├── vite.config.js       # dev proxy -> Express (no CORS needed in dev)
    └── src/
        ├── api.js           # fetch wrapper + automatic token refresh
        ├── context/         # AuthContext.jsx  SocketContext.jsx
        ├── pages/           # Login  Register  ChatPage  AdminPage
        └── components/      # Sidebar  ChatWindow  MessageBubble  NewChatModal ...
```

---

## 🚀 Getting started

**Prerequisites:** Node.js 18+ and MongoDB (local install or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Install everything
cd server && npm install
cd ../client && npm install

# 2. Configure the server
cd ../server
cp .env.example .env        # then edit .env: set MONGO_URI and two long random JWT secrets

# 3. Create the admin account (and 4 demo classmates)
npm run seed:demo

# 4. Run (two terminals)
cd server && npm run dev     # API + sockets on http://localhost:5000
cd client && npm run dev     # React app on  http://localhost:5173
```

Open <http://localhost:5173>.

**Demo logins (after `npm run seed:demo`)**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@chatbuddy.com` | `Admin@123` |
| User | `aarav@chatbuddy.com`, `diya@chatbuddy.com`, `kabir@chatbuddy.com`, `meera@chatbuddy.com` | `Pass@123` |

> 💡 To demo real-time features, log in as two different users in two different browsers (or one normal + one incognito window).

### Generating strong JWT secrets
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Production (single server)
```bash
cd client && npm run build
cd ../server && NODE_ENV=production npm start   # Express also serves client/dist
```
For a split deployment (e.g. Vercel + Render) set `CLIENT_URL` on the server, and `VITE_API_URL=https://your-api/api` and `VITE_SOCKET_URL=https://your-api` on the client.

---

## 🔌 REST API

All routes except `/auth/*` need `Authorization: Bearer <accessToken>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account → `{ user, accessToken, refreshToken }` |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | Exchange a refresh token for a new pair (rotation) |
| POST | `/api/auth/logout` | Revoke the refresh token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users?q=` | Search classmates |
| GET | `/api/chats` | My chats + `unreadCount` (aggregation) |
| POST | `/api/chats` | `{ userId }` open/create a one-to-one chat |
| POST | `/api/chats/group` | `{ name, memberIds[] }` create a group |
| GET | `/api/messages/chat/:chatId?before=&limit=` | Paginated history |
| POST | `/api/messages/chat/:chatId` | `{ text }` send a message |
| PATCH | `/api/messages/chat/:chatId/seen` | Mark everything in the chat as seen |
| GET | `/api/messages/chat/:chatId/search?q=` | **Text-index search** inside a chat |
| POST | `/api/messages/:id/star` | Toggle star |
| GET | `/api/messages/starred?chat=` | My starred messages |
| GET | `/api/admin/stats` | 🔒 admin – totals |
| GET | `/api/admin/users` | 🔒 admin – all users |
| PATCH | `/api/admin/users/:id/role` | 🔒 admin – `{ role }` |
| DELETE | `/api/admin/users/:id` | 🔒 admin – delete user |

## ⚡ Socket.IO events

| Event | Direction | Payload |
|---|---|---|
| *(connect)* | client → server | `auth: { token }` (same JWT access token) |
| `presence:list` | server → client | `[userId]` currently online (sent on connect) |
| `presence` | server → all | `{ userId, isOnline, lastSeen? }` |
| `typing` | client → server | `{ chatId, isTyping }` |
| `typing` | server → members | `{ chatId, userId, name, isTyping }` |
| `message:new` | server → members | the saved message (sender populated) |
| `messages:seen` | server → members | `{ chatId, userId }` |
| `chat:new` | server → invited users | the new chat |

Every user joins a personal room `user:<id>`, so one `emitToUsers()` helper delivers events to all of a user's open tabs. Messages are **saved through REST first** (reliable, validated) and then pushed over the socket.

---

## 🗄️ Database design

**User** – `name, email (unique), password (hashed), role, avatarColor, isOnline, lastSeen, refreshTokens[] (hashed)`

**Chat** – `isGroup, name, members[→User], groupAdmin, lastMessage[→Message]`  · index `{ members, updatedAt }`

**Message** – `chat[→Chat], sender[→User], text, seenBy[→User], starredBy[→User]`
Indexes: `{ chat, createdAt }` (history), `{ chat, sender }` (unread), `{ starredBy }`, and the **text index** `{ text: 'text' }` (search).

### The unread-count aggregation
```js
Message.aggregate([
  { $match: { chat: { $in: myChatIds }, sender: { $ne: me }, seenBy: { $ne: me } } },
  { $group: { _id: '$chat', count: { $sum: 1 } } },
]);
```
One query returns the unread number for every chat – no N+1 queries.

---

## 🔐 Security notes

- Passwords: bcrypt-hashed, never returned by the API.
- Refresh tokens: rotated, stored hashed, revocable (logout), max 5 sessions per user.
- Role is never accepted from the request body; admin changes go through the guarded admin routes.
- Chat membership is checked on every message route, socket typing event and star action.
- Input is validated and length-limited (2000 chars per message); user-supplied text is rendered by React (escaped), search input is regex-escaped.
- **Known trade-off:** tokens live in `localStorage` for simplicity. For a production deployment, move the refresh token into an `httpOnly` cookie.

## 🧠 Viva cheat-sheet

- **Why access + refresh tokens?** A leaked access token expires in 15 minutes; the long-lived refresh token is rotated and revocable.
- **Why REST for sending and Socket.IO for delivery?** REST gives validation, auth and error handling; sockets give instant push.
- **How do "seen" ticks work?** Opening a chat calls `/seen` → `$addToSet` the user into `seenBy` → server emits `messages:seen` → the sender's UI turns the ticks blue.
- **How does presence work with several tabs?** A `Map<userId, Set<socketId>>`; the user goes offline only when the *last* socket disconnects.
- **Why a text index?** `$text` search is stemmed and ranked by MongoDB and is much faster than a regex scan. Limitation: it matches whole words/stems (searching "meet" finds "meeting", but not "mee").

## 🔭 Ideas for future work
Image/file sharing, message delete/edit, group member management, read receipts per member, push notifications, end-to-end encryption.

---
Made with ❤️ as a capstone project.
