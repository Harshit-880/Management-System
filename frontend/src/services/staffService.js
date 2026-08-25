import { authService } from './authService';

const API_BASE = 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const staffService = {
  async getAll(filters = {}) {
    const params = new URLSearchParams();
    if (filters.hotelId) params.set('hotelId', filters.hotelId);
    if (filters.roleId)  params.set('roleId',  filters.roleId);
    const res = await fetch(`${API_BASE}/staff?${params}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load staff');
    return res.json();
  },

  async create(data) {
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create staff member');
    }
    return res.json();
  },

  async update(id, data) {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update staff member');
    }
    return res.json();
  },

  async deactivate(id) {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to deactivate staff member');
  },

  async getRoles() {
    const res = await fetch(`${API_BASE}/staff/roles`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load roles');
    return res.json();
  },
};
