import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useSocket } from '../context/SocketContext.jsx';
import { chatTitle, dayLabel, formatTime, lastSeenText, otherMember } from '../utils.js';
import Avatar from './Avatar.jsx';
import MessageBubble from './MessageBubble.jsx';
import { BackIcon, CloseIcon, SearchIcon, SendIcon, StarIcon } from './icons.jsx';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Wraps every search word found in the text with <mark>
function Highlight({ text, query }) {
  const words = query.split(/\s+/).filter((w) => w.length > 1).map(escapeRegex);
  if (!words.length) return text;
  const parts = text.split(new RegExp(`(${words.join('|')})`, 'gi'));
  return parts.map((p, i) => (i % 2 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>));
}

// Rendered with key={chat._id} by the parent, so all local state resets when you switch chats
export default function ChatWindow({ chat, me, messages, hasMore, loading, typingNames, onBack, onSend, onLoadMore, onToggleStar }) {
  const { socket, online, lastSeen } = useSocket();
  const socketRef = useRef(socket);
  socketRef.current = socket;

  const [text, setText] = useState('');
  const [sendError, setSendError] = useState('');
  const [panel, setPanel] = useState(null); // null | 'search' | 'starred'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const stick = useRef(true); // keep the view pinned to the newest message?
  const prepend = useRef(null); // remembers scroll position while older messages load
  const typingState = useRef({ active: false, timer: null });

  const other = chat.isGroup ? null : otherMember(chat, me._id);
  const title = chatTitle(chat, me._id);

  /* ---------- typing indicator (outgoing) ---------- */
  const stopTyping = () => {
    const t = typingState.current;
    clearTimeout(t.timer);
    if (t.active) {
      t.active = false;
      socketRef.current?.emit('typing', { chatId: chat._id, isTyping: false });
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    const t = typingState.current;
    if (!t.active) {
      t.active = true;
      socketRef.current?.emit('typing', { chatId: chat._id, isTyping: true });
    }
    clearTimeout(t.timer);
    t.timer = setTimeout(stopTyping, 1500);
  };

  useEffect(() => stopTyping, []); // eslint-disable-line react-hooks/exhaustive-deps

  // auto-grow the textarea
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  /* ---------- sending ---------- */
  const submit = async (e) => {
    e?.preventDefault();
    const value = text.trim();
    if (!value) return;
    setText('');
    setSendError('');
    stopTyping();
    stick.current = true;
    try {
      await onSend(value);
    } catch (err) {
      setText(value);
      setSendError(err.message);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  /* ---------- scrolling ---------- */
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (prepend.current) {
      el.scrollTop = el.scrollHeight - prepend.current.height + prepend.current.top;
      prepend.current = null;
      return;
    }
    const last = messages[messages.length - 1];
    if (stick.current || last?.sender._id === me._id) el.scrollTop = el.scrollHeight;
  }, [messages, panel, me._id]);

  const onScroll = (e) => {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const loadOlder = async () => {
    const el = listRef.current;
    setLoadingMore(true);
    prepend.current = { height: el.scrollHeight, top: el.scrollTop };
    try {
      await onLoadMore();
    } catch {
      prepend.current = null;
    } finally {
      setLoadingMore(false);
    }
  };

  /* ---------- search + starred panels ---------- */
  const openPanel = (name) => {
    setPanel((p) => (p === name ? null : name));
    setQuery('');
    setResults([]);
    stick.current = true;
  };

  // Search inside this chat (MongoDB text index on the server)
  useEffect(() => {
    if (panel !== 'search') return undefined;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setPanelLoading(true);
    const id = setTimeout(async () => {
      try {
        const data = await api.get(`/messages/chat/${chat._id}/search?q=${encodeURIComponent(q)}`);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setPanelLoading(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, panel, chat._id]);

  // My starred messages in this chat
  useEffect(() => {
    if (panel !== 'starred') return undefined;
    let cancelled = false;
    setPanelLoading(true);
    api
      .get(`/messages/starred?chat=${chat._id}`)
      .then((data) => !cancelled && setResults(data))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setPanelLoading(false));
    return () => {
      cancelled = true;
    };
  }, [panel, chat._id]);

  const starFromPanel = async (m) => {
    const r = await onToggleStar(m._id);
    setResults((prev) =>
      panel === 'starred' && !r.starred
        ? prev.filter((x) => x._id !== m._id)
        : prev.map((x) => (x._id === m._id ? { ...x, starredBy: r.starredBy } : x))
    );
  };

  /* ---------- header status line ---------- */
  let status;
  let statusClass = '';
  if (typingNames.length) {
    status = chat.isGroup ? `${typingNames.join(', ')} ${typingNames.length > 1 ? 'are' : 'is'} typing…` : 'typing…';
    statusClass = 'typing';
  } else if (chat.isGroup) {
    status = chat.members.map((m) => (m._id === me._id ? 'You' : m.name.split(' ')[0])).join(', ');
  } else if (other && online.has(other._id)) {
    status = 'online';
    statusClass = 'online';
  } else {
    status = lastSeenText(lastSeen[other?._id] || other?.lastSeen);
  }

  return (
    <section className="window">
      <header className="win-head">
        <button className="icon-btn back-btn" onClick={onBack} aria-label="Back to chats"><BackIcon /></button>
        <Avatar name={title} color={other?.avatarColor} group={chat.isGroup} online={other ? online.has(other._id) : undefined} />
        <div className="win-title">
          <strong>{title}</strong>
          <small className={statusClass}>{status}</small>
        </div>
        <div className="win-actions">
          <button className={`icon-btn ${panel === 'starred' ? 'active' : ''}`} onClick={() => openPanel('starred')} title="Starred messages"><StarIcon /></button>
          <button className={`icon-btn ${panel === 'search' ? 'active' : ''}`} onClick={() => openPanel('search')} title="Search in chat"><SearchIcon /></button>
        </div>
      </header>

      {panel === 'search' && (
        <div className="panel-bar">
          <SearchIcon size={18} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search in ${title}`} autoFocus />
          <button className="icon-btn" onClick={() => openPanel('search')} aria-label="Close search"><CloseIcon /></button>
        </div>
      )}
      {panel === 'starred' && (
        <div className="panel-bar">
          <StarIcon size={18} />
          <strong>Starred messages</strong>
          <button className="icon-btn" onClick={() => openPanel('starred')} aria-label="Close starred"><CloseIcon /></button>
        </div>
      )}

      {panel ? (
        <div className="results">
          {panelLoading && <p className="list-note">Searching…</p>}
          {!panelLoading && panel === 'search' && query.trim().length < 2 && <p className="list-note">Type at least 2 characters to search this chat.</p>}
          {!panelLoading && panel === 'search' && query.trim().length >= 2 && results.length === 0 && <p className="list-note">No messages match “{query.trim()}”.</p>}
          {!panelLoading && panel === 'starred' && results.length === 0 && <p className="list-note">No starred messages yet. Hover a message and tap the star.</p>}
          {results.map((m) => (
            <article key={m._id} className="result">
              <div className="r-top">
                <strong style={{ color: m.sender.avatarColor }}>{m.sender._id === me._id ? 'You' : m.sender.name}</strong>
                <time>{dayLabel(m.createdAt)}, {formatTime(m.createdAt)}</time>
              </div>
              <p><Highlight text={m.text} query={panel === 'search' ? query : ''} /></p>
              <button className={`star-btn static ${m.starredBy?.includes(me._id) ? 'on' : ''}`} onClick={() => starFromPanel(m)} aria-label="Toggle star">
                <StarIcon size={16} fill={m.starredBy?.includes(me._id) ? 'currentColor' : 'none'} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="messages" ref={listRef} onScroll={onScroll}>
          {hasMore && (
            <button className="load-more" onClick={loadOlder} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load earlier messages'}
            </button>
          )}
          {loading && <p className="list-note">Loading messages…</p>}
          {!loading && messages.length === 0 && (
            <div className="say-hi">
              <span>👋</span>
              <p>No messages yet. Say hi to {chat.isGroup ? 'the group' : title.split(' ')[0]}!</p>
            </div>
          )}

          {(() => {
            let lastDay = null;
            return messages.map((m, i) => {
              const day = new Date(m.createdAt).toDateString();
              const newDay = day !== lastDay;
              lastDay = day;
              const prev = messages[i - 1];
              const mine = m.sender._id === me._id;
              const showSender = chat.isGroup && !mine && (newDay || !prev || prev.sender._id !== m.sender._id);
              return (
                <Fragment key={m._id}>
                  {newDay && <div className="day-sep"><span>{dayLabel(m.createdAt)}</span></div>}
                  <MessageBubble msg={m} mine={mine} chat={chat} meId={me._id} showSender={showSender} onStar={() => onToggleStar(m._id)} />
                </Fragment>
              );
            });
          })()}

          {typingNames.length > 0 && (
            <div className="row">
              <div className="bubble typing-bubble" aria-label="typing"><i /><i /><i /></div>
            </div>
          )}
        </div>
      )}

      {sendError && <div className="send-error" role="alert">{sendError}</div>}
      <form className="composer" onSubmit={submit}>
        <textarea ref={inputRef} rows={1} value={text} onChange={onChange} onKeyDown={onKeyDown} placeholder="Type a message" maxLength={2000} />
        <button className="send-btn" disabled={!text.trim()} aria-label="Send message"><SendIcon size={20} /></button>
      </form>
    </section>
  );
}
