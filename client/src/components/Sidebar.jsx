import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Avatar from './Avatar.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { chatTitle, listTime, otherMember, useTheme } from '../utils.js';
import { LogoutIcon, MoonIcon, PlusIcon, SearchIcon, ShieldIcon, SunIcon, Logo } from './icons.jsx';

export default function Sidebar({ chats, loading, activeId, me, typing, onSelect, onNew, onLogout }) {
  const { online } = useSocket();
  const { theme, toggle } = useTheme();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? chats.filter((c) => chatTitle(c, me._id).toLowerCase().includes(needle)) : chats;
  }, [chats, q, me._id]);

  const preview = (chat) => {
    const last = chat.lastMessage;
    if (!last) return 'No messages yet';
    if (last.sender === me._id) return `You: ${last.text}`;
    if (chat.isGroup) {
      const sender = chat.members.find((m) => m._id === last.sender);
      return `${sender ? sender.name.split(' ')[0] : 'Someone'}: ${last.text}`;
    }
    return last.text;
  };

  return (
    <aside className="sidebar">
      <header className="sb-head">
        <div className="sb-me">
          <Logo size={34} />
          <div>
            <strong>ChatBuddy</strong>
            <small>{me.name}{me.role === 'admin' ? ' · Admin' : ''}</small>
          </div>
        </div>
        <div className="sb-actions">
          {me.role === 'admin' && (
            <Link to="/admin" className="icon-btn" title="Admin dashboard"><ShieldIcon /></Link>
          )}
          <button className="icon-btn" onClick={toggle} title="Toggle theme">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
          <button className="icon-btn" onClick={onLogout} title="Log out"><LogoutIcon /></button>
        </div>
      </header>

      <div className="sb-tools">
        <label className="sb-search">
          <SearchIcon size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chats" />
        </label>
        <button className="btn btn-primary btn-sm" onClick={onNew}><PlusIcon size={16} /> New</button>
      </div>

      <div className="chat-list">
        {loading && <p className="list-note">Loading chats…</p>}
        {!loading && chats.length === 0 && (
          <div className="list-empty">
            <p>No conversations yet</p>
            <button className="btn btn-primary" onClick={onNew}>Start a chat</button>
          </div>
        )}
        {!loading && chats.length > 0 && filtered.length === 0 && <p className="list-note">No chats match “{q}”.</p>}

        {filtered.map((chat) => {
          const other = chat.isGroup ? null : otherMember(chat, me._id);
          const typers = Object.values(typing[chat._id] || {});
          return (
            <button key={chat._id} className={`chat-item ${chat._id === activeId ? 'active' : ''}`} onClick={() => onSelect(chat._id)}>
              <Avatar
                name={chatTitle(chat, me._id)}
                color={other?.avatarColor}
                group={chat.isGroup}
                online={other ? online.has(other._id) : undefined}
              />
              <span className="ci-body">
                <span className="ci-top">
                  <span className="ci-name">{chatTitle(chat, me._id)}</span>
                  {chat.lastMessage && <span className={`ci-time ${chat.unreadCount ? 'unread' : ''}`}>{listTime(chat.lastMessage.createdAt)}</span>}
                </span>
                <span className="ci-bottom">
                  <span className={`ci-last ${typers.length ? 'typing' : ''}`}>{typers.length ? 'typing…' : preview(chat)}</span>
                  {chat.unreadCount > 0 && <span className="badge">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
