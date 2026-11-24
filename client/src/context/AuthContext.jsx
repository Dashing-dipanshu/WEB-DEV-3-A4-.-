import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokens } from '../api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on page load, and react to forced logouts (expired refresh token)
  useEffect(() => {
    const onForcedLogout = () => setUser(null);
    window.addEventListener('cb:logout', onForcedLogout);

    (async () => {
      if (tokens.access || tokens.refresh) {
        try {
          const data = await api.get('/auth/me');
          setUser(data.user);
        } catch {
          tokens.clear();
        }
      }
      setLoading(false);
    })();

    return () => window.removeEventListener('cb:logout', onForcedLogout);
  }, []);

  const authenticate = async (path, body) => {
    const data = await api.post(path, body);
    tokens.set(data);
    setUser(data.user);
  };

  const login = (email, password) => authenticate('/auth/login', { email, password });
  const register = (name, email, password) => authenticate('/auth/register', { name, email, password });

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: tokens.refresh });
    } catch {
      /* logging out locally is enough */
    }
    tokens.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
