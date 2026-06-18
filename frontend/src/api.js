// src/api.js — tiny fetch wrapper that attaches the JWT and parses JSON / errors.
const TOKEN_KEY = 'popeyez_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const text = await res.text();
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  get:   (p)        => request('GET', p),
  post:  (p, body)  => request('POST', p, body),
  put:   (p, body)  => request('PUT', p, body),
  patch: (p, body)  => request('PATCH', p, body),
  del:   (p)        => request('DELETE', p),
};
