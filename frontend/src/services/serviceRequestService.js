import { authService } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5291/api';

function headers() {
  const token = authService.getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

export const serviceRequestService = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v != null && qs.append(k, v));
    return fetch(`${API_BASE}/service-requests?${qs}`, { headers: headers() }).then(handle);
  },
  getById: (id) =>
    fetch(`${API_BASE}/service-requests/${id}`, { headers: headers() }).then(handle),
  create: (body) =>
    fetch(`${API_BASE}/service-requests`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    }).then(handle),
  assign: (id, assignedToUserId) =>
    fetch(`${API_BASE}/service-requests/${id}/assign`, {
      method: 'PUT', headers: headers(), body: JSON.stringify({ assignedToUserId }),
    }).then(handle),
  updateStatus: (id, status) =>
    fetch(`${API_BASE}/service-requests/${id}/status`, {
      method: 'PUT', headers: headers(), body: JSON.stringify(status),
    }).then(handle),
  remove: (id) =>
    fetch(`${API_BASE}/service-requests/${id}`, {
      method: 'DELETE', headers: headers(),
    }).then(handle),
};
