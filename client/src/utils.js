import { useState } from 'react';

export const otherMember = (chat, meId) => chat.members.find((m) => m._id !== meId);

export const chatTitle = (chat, meId) =>
  chat.isGroup ? chat.name : otherMember(chat, meId)?.name || 'Deleted user';

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysAgo = (iso) => Math.round((startOfDay(new Date()) - startOfDay(new Date(iso))) / 86400000);

export const formatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const shortDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

export const dayLabel = (iso) => {
  const n = daysAgo(iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return shortDate(iso);
};

export const listTime = (iso) => {
  const n = daysAgo(iso);
  if (n === 0) return formatTime(iso);
  if (n === 1) return 'Yesterday';
  return shortDate(iso);
};

export const lastSeenText = (iso) => {
  if (!iso) return 'offline';
  const n = daysAgo(iso);
  if (n === 0) return `last seen today at ${formatTime(iso)}`;
  if (n === 1) return `last seen yesterday at ${formatTime(iso)}`;
  return `last seen ${shortDate(iso)}`;
};

// Dark / light theme (saved in localStorage, applied via data-theme on <html>)
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('cb_theme', next);
    setTheme(next);
  };
  return { theme, toggle };
}
