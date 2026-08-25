import { authService } from './authService';

const API_BASE = 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const hotelService = {
  async getAll(params = {}) {
    const q = new URLSearchParams();
    if (params.includeInactive) q.set('includeInactive', 'true');
    const res = await fetch(`${API_BASE}/hotels?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load hotels');
    return res.json();
  },

  async create(data) {
    const res = await fetch(`${API_BASE}/hotels`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create hotel');
    }
    return res.json();
  },

  async update(id, data) {
    const res = await fetch(`${API_BASE}/hotels/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update hotel');
    }
    return res.json();
  },

  async remove(id) {
    const res = await fetch(`${API_BASE}/hotels/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete hotel');
  },

  async activate(id) {
    const res = await fetch(`${API_BASE}/hotels/${id}/activate`, {
      method: 'PUT',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to activate hotel');
    return res.json();
  },
};
