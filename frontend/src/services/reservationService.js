import { authService } from './authService';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

async function action(url, method = 'PUT') {
  const res = await fetch(url, { method, headers: authHeaders() });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.message || 'Request failed');
  }
  return res.json();
}

export const reservationService = {
  async getAll(params = {}) {
    const q = new URLSearchParams();
    if (params.hotelId)     q.set('hotelId',     String(params.hotelId));
    if (params.status)      q.set('status',      params.status);
    if (params.checkInDate) q.set('checkInDate', params.checkInDate);
    if (params.guestId)     q.set('guestId',     String(params.guestId));
    const res = await fetch(`${API_BASE}/reservations?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load reservations');
    return res.json();
  },

  async create(data) {
    const res = await fetch(`${API_BASE}/reservations`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || 'Failed to create reservation');
    }
    return res.json();
  },

  confirm:  (id) => action(`${API_BASE}/reservations/${id}/confirm`),
  checkIn:  (id) => action(`${API_BASE}/reservations/${id}/checkin`),
  checkOut: (id) => action(`${API_BASE}/reservations/${id}/checkout`),
  cancel:   (id) => action(`${API_BASE}/reservations/${id}/cancel`),

  async changeRoom(id, roomId) {
    const res = await fetch(`${API_BASE}/reservations/${id}/changeroom`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ roomId }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || 'Failed to change room');
    }
    return res.json();
  },

  async modify(id, data) {
    const res = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.message || 'Failed to modify reservation');
    }
    return res.json();
  },
};
