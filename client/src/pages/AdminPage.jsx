import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Avatar from '../components/Avatar.jsx';
import { BackIcon, TrashIcon } from '../components/icons.jsx';

const STATS = [
  ['users', 'Total users'],
  ['online', 'Online now'],
  ['chats', 'Chats'],
  ['groups', 'Group chats'],
  ['messages', 'Messages'],
];

export default function AdminPage() {
  const { user: me } = useAuth();
  const { online } = useSocket();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [s, u] = await Promise.all([api.get('/admin/stats'), api.get('/admin/users')]);
      setStats(s);
      setUsers(u);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (u, role) => {
    setError('');
    try {
      await api.patch(`/admin/users/${u._id}/role`, { role });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? { ...x, role } : x)));
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}? Their one-to-one chats will be removed too.`)) return;
    setError('');
    try {
      await api.del(`/admin/users/${u._id}`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin">
      <header className="admin-head">
        <Link to="/" className="btn btn-ghost"><BackIcon size={18} /> Back to chats</Link>
        <div>
          <h1>Admin dashboard</h1>
          <p className="muted">Manage users and keep an eye on activity.</p>
        </div>
      </header>

      {error && <div className="auth-error">{error}</div>}

      <section className="stats">
        {STATS.map(([key, label]) => (
          <div className="stat" key={key}>
            <span>{label}</span>
            <strong>{stats ? stats[key] : '–'}</strong>
          </div>
        ))}
      </section>

      <section className="table-card">
        <h2>Users</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>User</th><th>Email</th><th>Status</th><th>Role</th><th>Joined</th><th /></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u._id === me._id;
                return (
                  <tr key={u._id}>
                    <td>
                      <div className="t-user">
                        <Avatar name={u.name} color={u.avatarColor} size={34} />
                        <strong>{u.name}{isMe && <em> (you)</em>}</strong>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td><span className={`pill ${online.has(u._id) ? 'green' : ''}`}>{online.has(u._id) ? 'Online' : 'Offline'}</span></td>
                    <td>
                      <select value={u.role} disabled={isMe} onChange={(e) => changeRole(u, e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <button className="icon-btn danger" disabled={isMe} onClick={() => remove(u)} title="Delete user"><TrashIcon size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
