import { authService } from './authService';

const API_BASE = 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const paymentService = {
  async getOverview(hotelId) {
    const q = hotelId ? `?hotelId=${hotelId}` : '';
    const res = await fetch(`${API_BASE}/payments/overview${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load payment overview');
    return res.json();
  },

  async getAll(params = {}) {
    const q = new URLSearchParams();
    if (params.hotelId)       q.set('hotelId', String(params.hotelId));
    if (params.reservationId) q.set('reservationId', String(params.reservationId));
    const res = await fetch(`${API_BASE}/payments?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load payments');
    return res.json();
  },

  async create(data) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to record payment');
    }
    return res.json();
  },

  async refund(paymentId, data) {
    const res = await fetch(`${API_BASE}/payments/${paymentId}/refund`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to process refund');
    }
    return res.json();
  },
};
