import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Avatar from './Avatar.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { CloseIcon, SearchIcon } from './icons.jsx';

export default function NewChatModal({ onClose, onCreated }) {
  const { online } = useSocket();
  const [tab, setTab] = useState('direct'); // 'direct' | 'group'
  const [q, setQ] = useState('');
  const [users, setUsers] = useState([]);
  const [picked, setPicked] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Debounced user search
  useEffect(() => {
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const list = await api.get(`/users?q=${encodeURIComponent(q.trim())}`);
        if (!cancelled) setUsers(list);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [q]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const startDirect = async (user) => {
    setBusy(true);
    setError('');
    try {
      onCreated(await api.post('/chats', { userId: user._id }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const togglePick = (user) =>
    setPicked((p) => (p.some((x) => x._id === user._id) ? p.filter((x) => x._id !== user._id) : [...p, user]));

  const createGroup = async () => {
    setError('');
    if (groupName.trim().length < 2) return setError('Give the group a name');
    if (picked.length < 1) return setError('Pick at least one member');
    setBusy(true);
    try {
      onCreated(await api.post('/chats/group', { name: groupName.trim(), memberIds: picked.map((u) => u._id) }));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Start a new chat">
        <header className="modal-head">
          <h3>New chat</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><CloseIcon /></button>
        </header>

        <div className="tabs">
          <button className={`tab ${tab === 'direct' ? 'active' : ''}`} onClick={() => setTab('direct')}>One-to-one</button>
          <button className={`tab ${tab === 'group' ? 'active' : ''}`} onClick={() => setTab('group')}>Group</button>
        </div>

        {tab === 'group' && (
          <input className="modal-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name (e.g. Web Dev Capstone)" maxLength={40} />
        )}

        {tab === 'group' && picked.length > 0 && (
          <div className="chips">
            {picked.map((u) => (
              <button key={u._id} className="chip" onClick={() => togglePick(u)}>{u.name} <CloseIcon size={12} /></button>
            ))}
          </div>
        )}

        <label className="sb-search modal-search">
          <SearchIcon size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search classmates by name or email" autoFocus />
        </label>

        <div className="user-list">
          {users.length === 0 && <p className="list-note">No users found.</p>}
          {users.map((u) => {
            const isPicked = picked.some((x) => x._id === u._id);
            return (
              <button
                key={u._id}
                className={`user-row ${isPicked ? 'picked' : ''}`}
                disabled={busy}
                onClick={() => (tab === 'direct' ? startDirect(u) : togglePick(u))}
              >
                <Avatar name={u.name} color={u.avatarColor} size={38} online={online.has(u._id)} />
                <span className="ur-text">
                  <strong>{u.name}</strong>
                  <small>{u.email}</small>
                </span>
                {tab === 'group' && <span className={`check ${isPicked ? 'on' : ''}`} />}
              </button>
            );
          })}
        </div>

        {error && <div className="auth-error">{error}</div>}

        {tab === 'group' && (
          <footer className="modal-foot">
            <button className="btn btn-primary" onClick={createGroup} disabled={busy}>
              {busy ? 'Creating…' : `Create group${picked.length ? ` (${picked.length + 1})` : ''}`}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
