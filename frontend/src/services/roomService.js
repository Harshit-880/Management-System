import { authService } from './authService';

const API_BASE = 'http://localhost:5291/api';

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authService.getToken()}`,
  };
}

export const roomService = {
  // Rooms — omit hotelId to fetch rooms across all hotels
  async getRooms(hotelId) {
    const q = hotelId ? `?hotelId=${hotelId}` : '';
    const res = await fetch(`${API_BASE}/rooms${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load rooms');
    return res.json();
  },

  // Rooms available for a specific date range (no overlapping reservations)
  async getAvailable(hotelId, checkIn, checkOut) {
    const q = new URLSearchParams({ hotelId: String(hotelId), checkIn, checkOut });
    const res = await fetch(`${API_BASE}/rooms/available?${q}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load available rooms');
    return res.json();
  },

  async createRoom(data) {
    const res = await fetch(`${API_BASE}/rooms`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create room');
    }
    return res.json();
  },

  async bulkCreate(data) {
    const res = await fetch(`${API_BASE}/rooms/bulk`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create rooms');
    }
    return res.json(); // { created: [], skippedDuplicates: [] }
  },

  async updateRoom(id, data) {
    const res = await fetch(`${API_BASE}/rooms/${id}`, {
      method: 'PUT', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update room');
    return res.json();
  },

  async deleteRoom(id) {
    const res = await fetch(`${API_BASE}/rooms/${id}`, {
      method: 'DELETE', headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete room');
  },

  // Room Types
  async getRoomTypes(hotelId) {
    const res = await fetch(`${API_BASE}/rooms/types?hotelId=${hotelId}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load room types');
    return res.json();
  },

  async createRoomType(data) {
    const res = await fetch(`${API_BASE}/rooms/types`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create room type');
    }
    return res.json();
  },
};
