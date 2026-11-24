import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { api, tokens } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, online: new Set(), lastSeen: {} });
export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(() => new Set()); // ids of users who are online right now
  const [lastSeen, setLastSeen] = useState({}); // userId -> ISO date (updated live)

  useEffect(() => {
    if (!user) return undefined;

    const s = io(import.meta.env.VITE_SOCKET_URL || undefined, {
      // function form => the newest access token is used on every (re)connect
      auth: (cb) => cb({ token: tokens.access }),
    });

    s.on('presence:list', (ids) => setOnline(new Set(ids)));
    s.on('presence', ({ userId, isOnline, lastSeen: seen }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
      if (seen) setLastSeen((prev) => ({ ...prev, [userId]: seen }));
    });

    // Access token expired? A normal API call refreshes it, then we reconnect.
    s.on('connect_error', (err) => {
      if (err.message === 'Unauthorized') {
        api.get('/auth/me').then(() => s.connect()).catch(() => {});
      }
    });

    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setOnline(new Set());
    };
  }, [user?._id]);

  return <SocketContext.Provider value={{ socket, online, lastSeen }}>{children}</SocketContext.Provider>;
}
