import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Sidebar from '../components/Sidebar.jsx';
import ChatWindow from '../components/ChatWindow.jsx';
import NewChatModal from '../components/NewChatModal.jsx';
import { Logo } from '../components/icons.jsx';

export default function ChatPage() {
  const { user, logout } = useAuth();
  const { socket } = useSocket();

  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typing, setTyping] = useState({}); // chatId -> { userId: name }
  const [showNew, setShowNew] = useState(false);

  // Refs let socket callbacks always see the latest values without re-subscribing
  const activeRef = useRef(null);
  const chatsRef = useRef([]);
  const typingTimers = useRef({});
  activeRef.current = activeId;
  chatsRef.current = chats;

  /* ---------- loading data ---------- */
  const loadChats = useCallback(async () => {
    try {
      setChats(await api.get('/chats'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Receiver opened the chat -> mark everything seen (server then notifies the sender)
  const markSeen = useCallback((chatId) => {
    api.patch(`/messages/chat/${chatId}/seen`).catch(() => {});
    setChats((prev) => prev.map((c) => (c._id === chatId && c.unreadCount ? { ...c, unreadCount: 0 } : c)));
  }, []);

  const fetchMessages = useCallback(
    async (chatId) => {
      const data = await api.get(`/messages/chat/${chatId}`);
      if (activeRef.current !== chatId) return; // user switched chats meanwhile
      setMessages(data.messages);
      setHasMore(data.hasMore);
      markSeen(chatId);
    },
    [markSeen]
  );

  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    setMessages([]);
    setHasMore(false);
    setLoadingMsgs(true);
    fetchMessages(activeId)
      .catch((err) => console.error(err))
      .finally(() => !cancelled && setLoadingMsgs(false));
    return () => {
      cancelled = true;
    };
  }, [activeId, fetchMessages]);

  const loadOlder = async () => {
    const chatId = activeId;
    const first = messages[0];
    if (!first) return;
    const data = await api.get(`/messages/chat/${chatId}?before=${encodeURIComponent(first.createdAt)}`);
    if (activeRef.current !== chatId) return;
    setMessages((prev) => [...data.messages.filter((o) => !prev.some((p) => p._id === o._id)), ...prev]);
    setHasMore(data.hasMore);
  };

  /* ---------- real-time events ---------- */
  // A message arrived (via socket) or was just sent by me (via REST response)
  const applyIncoming = useCallback(
    (msg) => {
      const chatId = msg.chat;
      const mine = msg.sender._id === user._id;
      const isActive = activeRef.current === chatId;

      if (isActive) {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
        if (!mine) markSeen(chatId);
      }
      if (!mine) {
        // the sender obviously stopped typing
        setTyping((prev) => {
          if (!prev[chatId]?.[msg.sender._id]) return prev;
          const rest = { ...prev[chatId] };
          delete rest[msg.sender._id];
          return { ...prev, [chatId]: rest };
        });
      }

      if (!chatsRef.current.some((c) => c._id === chatId)) {
        loadChats(); // first message of a chat we have not loaded yet
        return;
      }
      setChats((prev) => {
        const chat = prev.find((c) => c._id === chatId);
        if (!chat) return prev;
        const updated = {
          ...chat,
          updatedAt: msg.createdAt,
          lastMessage: { _id: msg._id, text: msg.text, sender: msg.sender._id, createdAt: msg.createdAt, seenBy: msg.seenBy || [] },
          unreadCount: !mine && !isActive ? (chat.unreadCount || 0) + 1 : chat.unreadCount,
        };
        return [updated, ...prev.filter((c) => c._id !== chatId)]; // move chat to the top
      });
    },
    [user._id, markSeen, loadChats]
  );

  useEffect(() => {
    if (!socket) return undefined;

    const clearTyper = (chatId, userId) =>
      setTyping((prev) => {
        const rest = { ...(prev[chatId] || {}) };
        delete rest[userId];
        return { ...prev, [chatId]: rest };
      });

    const onTyping = ({ chatId, userId, name, isTyping }) => {
      const key = `${chatId}:${userId}`;
      clearTimeout(typingTimers.current[key]);
      if (isTyping) {
        setTyping((prev) => ({ ...prev, [chatId]: { ...(prev[chatId] || {}), [userId]: name } }));
        // safety net in case the "stopped typing" event is lost
        typingTimers.current[key] = setTimeout(() => clearTyper(chatId, userId), 5000);
      } else {
        clearTyper(chatId, userId);
      }
    };

    const onSeen = ({ chatId, userId }) => {
      if (userId === user._id) {
        // I read this chat on another tab/device
        setChats((prev) => prev.map((c) => (c._id === chatId ? { ...c, unreadCount: 0 } : c)));
        return;
      }
      if (chatId === activeRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.sender._id !== userId && !(m.seenBy || []).includes(userId) ? { ...m, seenBy: [...(m.seenBy || []), userId] } : m))
        );
      }
    };

    const onChatNew = (chat) => setChats((prev) => (prev.some((c) => c._id === chat._id) ? prev : [chat, ...prev]));

    // After a dropped connection, re-sync anything we may have missed
    const onReconnect = () => {
      loadChats();
      if (activeRef.current) fetchMessages(activeRef.current).catch(() => {});
    };

    socket.on('message:new', applyIncoming);
    socket.on('messages:seen', onSeen);
    socket.on('typing', onTyping);
    socket.on('chat:new', onChatNew);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('message:new', applyIncoming);
      socket.off('messages:seen', onSeen);
      socket.off('typing', onTyping);
      socket.off('chat:new', onChatNew);
      socket.io.off('reconnect', onReconnect);
    };
  }, [socket, user._id, applyIncoming, loadChats, fetchMessages]);

  /* ---------- actions ---------- */
  const send = async (text) => {
    const msg = await api.post(`/messages/chat/${activeId}`, { text });
    applyIncoming(msg);
  };

  const toggleStar = async (id) => {
    const r = await api.post(`/messages/${id}/star`);
    setMessages((prev) => prev.map((m) => (m._id === id ? { ...m, starredBy: r.starredBy } : m)));
    return r;
  };

  const onChatCreated = (chat) => {
    setChats((prev) => (prev.some((c) => c._id === chat._id) ? prev : [chat, ...prev]));
    setActiveId(chat._id);
    setShowNew(false);
  };

  const activeChat = chats.find((c) => c._id === activeId);

  return (
    <div className={`app ${activeChat ? 'chat-open' : ''}`}>
      <Sidebar
        chats={chats}
        loading={loadingChats}
        activeId={activeId}
        me={user}
        typing={typing}
        onSelect={setActiveId}
        onNew={() => setShowNew(true)}
        onLogout={logout}
      />

      {activeChat ? (
        <ChatWindow
          key={activeChat._id}
          chat={activeChat}
          me={user}
          messages={messages}
          hasMore={hasMore}
          loading={loadingMsgs}
          typingNames={Object.values(typing[activeChat._id] || {})}
          onBack={() => setActiveId(null)}
          onSend={send}
          onLoadMore={loadOlder}
          onToggleStar={toggleStar}
        />
      ) : (
        <section className="window empty">
          <div className="empty-state">
            <Logo size={72} />
            <h2>Welcome to ChatBuddy</h2>
            <p>Select a conversation, or start a new one with a classmate.</p>
            <button className="btn btn-primary" onClick={() => setShowNew(true)}>Start a new chat</button>
          </div>
        </section>
      )}

      {showNew && <NewChatModal onClose={() => setShowNew(false)} onCreated={onChatCreated} />}
    </div>
  );
}
