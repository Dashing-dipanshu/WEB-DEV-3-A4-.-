# 💬 ChatBuddy -- WhatsApp Clone

A real-time chat application for private and group conversations. Users
can see who is online, view message read receipts, and chat instantly.
Built with the **MERN stack and Socket.IO** as a Web Development
capstone project.

## 🛠️ Tech Stack

-   **Frontend:** React 18, Vite, React Router, Fetch API, Context API,
    Socket.IO Client
-   **Backend:** Node.js, Express, Mongoose, JWT, bcrypt, Socket.IO,
    dotenv
-   **Database:** MongoDB (`User`, `Chat`, `Message` collections)
-   **Roles:** User and Admin

## ✨ Features

-   **Authentication:** Register and log in using JWT access tokens (15
    minutes) and refresh tokens (7 days). Refresh tokens rotate and are
    stored as SHA-256 hashes.
-   **Password security:** Passwords are hashed using bcrypt (10 salt
    rounds).
-   **Role-based access:** Admin routes and pages are protected. Users
    cannot register themselves as admins.
-   **Private and group chats:** Create one-to-one conversations or
    groups.
-   **Message history:** Messages are saved in MongoDB and loaded with
    pagination.
-   **Online status:** See users' online/offline status and last-seen
    time.
-   **Typing indicator:** See when another member is typing.
-   **Read receipts:** ✓ means sent; blue ✓✓ means seen. Group receipts
    show who has read a message.
-   **Unread counts:** MongoDB aggregation calculates unread messages
    for all chats.
-   **Starred messages and search:** Save messages privately and search
    chat messages using a MongoDB text index.
-   **Extras:** Dark/light theme, responsive layout, admin dashboard,
    user management, and connection resync.

## 🗂️ Project Structure

``` text
chatbuddy/
├── server/
│   ├── server.js
│   ├── socket.js
│   ├── seed.js
│   ├── config/
│   ├── models/       # User, Chat, Message
│   ├── middleware/  # Authentication, roles, errors
│   ├── routes/      # Auth, users, chats, messages, admin
│   └── utils/       # Tokens and socket helpers
└── client/
    ├── vite.config.js
    └── src/
        ├── api.js
        ├── context/
        ├── pages/
        └── components/
```

## 🚀 Getting Started

**Requirements:** Node.js 18+ and MongoDB (local or MongoDB Atlas).

### 1. Install dependencies

``` bash
cd server
npm install
cd ../client
npm install
```

### 2. Configure the server

``` bash
cd ../server
cp .env.example .env
```

Add your `MONGO_URI` and two strong JWT secrets to the `.env` file.

### 3. Create the admin and demo users

``` bash
npm run seed:demo
```

### 4. Start the application

Run these commands in two separate terminals:

``` bash
cd server
npm run dev
```

``` bash
cd client
npm run dev
```

-   Backend: `http://localhost:5000`
-   Frontend: `http://localhost:5173`

Open the frontend URL in your browser.

### Demo Accounts

  ------------------------------------------------------------------------
  Role                    Email                    Password
  ----------------------- ------------------------ -----------------------
  Admin                   `admin@chatbuddy.com`    `Admin@123`

  User                    `aarav@chatbuddy.com`,   `Pass@123`
                          `diya@chatbuddy.com`,    
                          `kabir@chatbuddy.com`,   
                          `meera@chatbuddy.com`    
  ------------------------------------------------------------------------

To test real-time features, sign in as two different users in separate
browsers or use a normal and an incognito window.

### Generate JWT Secrets

``` bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Production Build

``` bash
cd client
npm run build
cd ../server
NODE_ENV=production npm start
```

For separate frontend/backend deployment, configure `CLIENT_URL`,
`VITE_API_URL`, and `VITE_SOCKET_URL`.

## 🔌 REST API

All routes except `/api/auth/*` require an access token:

`Authorization: Bearer <accessToken>`

  ----------------------------------------------------------------------------------------
  Method                  Route                                    Purpose
  ----------------------- ---------------------------------------- -----------------------
  POST                    `/api/auth/register`                     Register

  POST                    `/api/auth/login`                        Login

  POST                    `/api/auth/refresh`                      Refresh and rotate
                                                                   tokens

  POST                    `/api/auth/logout`                       Revoke refresh token

  GET                     `/api/auth/me`                           Get current user

  GET                     `/api/users?q=`                          Search users

  GET / POST              `/api/chats`                             List chats / open or
                                                                   create a private chat

  POST                    `/api/chats/group`                       Create a group

  GET / POST              `/api/messages/chat/:chatId`             Get history / send a
                                                                   message

  PATCH                   `/api/messages/chat/:chatId/seen`        Mark messages as seen

  GET                     `/api/messages/chat/:chatId/search?q=`   Search messages

  POST                    `/api/messages/:id/star`                 Star or unstar a
                                                                   message

  GET                     `/api/messages/starred?chat=`            List starred messages

  GET                     `/api/admin/stats`                       Admin statistics

  GET                     `/api/admin/users`                       List users (admin)

  PATCH                   `/api/admin/users/:id/role`              Change user role
                                                                   (admin)

  DELETE                  `/api/admin/users/:id`                   Delete user (admin)
  ----------------------------------------------------------------------------------------

## ⚡ Socket.IO Events

  Event             Purpose
  ----------------- -------------------------------------------
  `presence:list`   List users currently online
  `presence`        Notify users about online/offline changes
  `typing`          Send and receive typing status
  `message:new`     Deliver a newly saved message
  `messages:seen`   Notify members that a message was seen
  `chat:new`        Notify invited users about a new chat

Clients authenticate sockets with the same access token used by the REST
API. Each user joins a personal room, allowing events to reach all their
open tabs. Messages are first saved through REST and then delivered
through Socket.IO.

## 🗄️ Database Design

-   **User:** Name, unique email, hashed password, role, avatar color,
    online status, last seen, and hashed refresh tokens.
-   **Chat:** Group/private-chat details, members, group admin, and last
    message.
-   **Message:** Chat, sender, text, users who have seen it, and users
    who starred it.

Indexes support chat history, unread-message checks, starred messages,
and text search.

### Unread Message Count

A MongoDB aggregation filters messages that were sent by someone else
and have not been seen by the current user. It groups the results by
chat and counts unread messages in one query, avoiding separate queries
for every chat.

## 🔐 Security

-   Passwords are bcrypt-hashed and are not returned by the API.
-   Refresh tokens are rotated, hashed in the database, revocable, and
    limited to five sessions per user.
-   Users cannot set their own role; admin changes use protected routes.
-   Chat membership is checked before message, typing, and star actions.
-   Message input is limited to 2,000 characters and user text is safely
    rendered.
-   **Known trade-off:** Tokens are stored in `localStorage` for
    simplicity. For production, move the refresh token to an `httpOnly`
    cookie.

## 🧠 Viva Cheat-Sheet

-   **Why access and refresh tokens?** Access tokens expire quickly;
    refresh tokens provide continued login and can be rotated or
    revoked.
-   **Why REST and Socket.IO together?** REST handles validation and
    saving; Socket.IO delivers updates instantly.
-   **How do read receipts work?** Opening a chat marks messages as
    seen, updates `seenBy`, and sends a live event to other members.
-   **How does multi-tab presence work?** A user is online while at
    least one of their socket connections is active.
-   **Why use a text index?** MongoDB text search is faster and supports
    word stems, but it does not match every partial word.

## 🔭 Future Improvements

Image and file sharing, message editing/deletion, group-member
management, per-member read receipts, push notifications, and end-to-end
encryption.

------------------------------------------------------------------------

Made with ❤️ as a capstone project.
