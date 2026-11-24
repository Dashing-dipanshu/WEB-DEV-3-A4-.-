// Thin wrapper around the Fetch API:
//  - attaches the JWT access token
//  - on a 401 it silently asks /auth/refresh for a new pair, then retries the request once
const BASE = import.meta.env.VITE_API_URL || '/api';

const ACCESS_KEY = 'cb_access';
const REFRESH_KEY = 'cb_refresh';

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

let refreshing = null; // share one refresh call between parallel requests

function refreshTokens() {
  if (!refreshing) {
    refreshing = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refresh }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('Session expired');
        const data = await res.json();
        tokens.set(data);
        return data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function request(path, { method = 'GET', body, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (tokens.access) headers.Authorization = `Bearer ${tokens.access}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const isCredentialCall = /^\/auth\/(login|register)/.test(path);
  if (res.status === 401 && retry && tokens.refresh && !isCredentialCall) {
    try {
      await refreshTokens();
    } catch {
      tokens.clear();
      window.dispatchEvent(new Event('cb:logout'));
      throw new Error('Your session expired. Please log in again.');
    }
    return request(path, { method, body, retry: false });
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
