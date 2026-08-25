import { authService } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const guestService = {
  async getAll(params = {}) {
    const q = new URLSearchParams();
    if (params.hotelId) q.set('hotelId', String(params.hotelId));
    if (params.search)  q.set('search',  params.search);
    const res = await fetch(`${API_BASE}/guests?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load guests');
    return res.json();
  },
  async updateNotes(guestId, notes) {
    const res = await fetch(`${API_BASE}/guests/${guestId}/notes`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify({ notes }),
    });
    if (!res.ok) throw new Error('Failed to save guest notes');
    return res.json();
  },
};
