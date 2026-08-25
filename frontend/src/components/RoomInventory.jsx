import { useState, useMemo, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import TopBar from './TopBar';
import AddInventoryModal from './AddInventoryModal';
import NewReservationModal from './NewReservationModal';
import ChangeRoomModal from './ChangeRoomModal';
import { useAuth } from '../context/AuthContext';
import { roomService } from '../services/roomService';
import { hotelService } from '../services/hotelService';
import { reservationService } from '../services/reservationService';

const TODAY    = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

const STATUS_OPTIONS = ['Available', 'Occupied', 'Dirty', 'Maintenance', 'OutOfService'];

const ROOM_STATUS = {
  Available:    { label: 'CLEAN',    bg: '#f0fdf4', border: '#86efac', text: '#16a34a' },
  Reserved:     { label: 'RESERVED', bg: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' },
  Occupied:     { label: 'OCC',      bg: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
  Dirty:        { label: 'CLEANING', bg: '#fff7ed', border: '#fdba74', text: '#ea580c' },
  Maintenance:  { label: 'MAINT',    bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' },
  OutOfService: { label: 'OOS',      bg: '#f9fafb', border: '#d1d5db', text: '#6b7280' },
};

const LEGEND = [
  { key: 'Available',    label: 'AVAILABLE',   dot: '#22c55e' },
  { key: 'Reserved',     label: 'RESERVED',    dot: '#8b5cf6' },
  { key: 'Occupied',     label: 'OCCUPIED',    dot: '#3b82f6' },
  { key: 'Dirty',        label: 'CLEANING',    dot: '#f97316' },
  { key: 'Maintenance',  label: 'MAINTENANCE', dot: '#ef4444' },
  { key: 'OutOfService', label: 'OOS',         dot: '#9ca3af' },
];

/* ── Edit Room Modal ───────────────────────────────── */
// `reservationInfo` (optional): { kind: 'occupied' | 'reserved', reservation }
// derived from live reservations — lets the manager see who's in/booked for
// this room and act on it (move guest, check in, or book a walk-in).
function EditRoomModal({ room, reservationInfo, onClose, onSaved, onDeleted, onMoveGuest, onCheckInGuest, onBookRoom }) {
  const [status,  setStatus]  = useState(room.status);
  const [price,   setPrice]   = useState(room.priceOverride != null ? String(room.priceOverride) : '');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [confirm, setConfirm] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    setCheckingIn(true); setError('');
    try {
      await onCheckInGuest(reservationInfo.reservation);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setCheckingIn(false); }
  };

  const handleSave = async () => {
    setError(''); setLoading(true);
    try {
      const updated = await roomService.updateRoom(room.roomId, {
        status,
        price: price !== '' ? Number(price) : null,
      });
      onSaved(updated);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setError(''); setLoading(true);
    try {
      await roomService.deleteRoom(room.roomId);
      onDeleted(room.roomId);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal edit-room-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Room {room.roomNumber}</h2>
            <p className="modal-sub">{room.roomTypeName} · {room.floor} · {room.capacity} guests</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {error && <div className="error-msg" style={{ margin: '0 1.5rem .5rem' }}>{error}</div>}

        <div className="edit-room-body">
          {/* Current guest (Occupied) */}
          {reservationInfo?.kind === 'occupied' && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '.9rem 1rem' }}>
              <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: '.4rem' }}>
                Current Guest
              </div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{reservationInfo.reservation.guestName}</div>
              <div style={{ fontSize: '.8rem', color: '#6b7280', marginTop: '.15rem' }}>
                {reservationInfo.reservation.guestPhone || reservationInfo.reservation.guestEmail || 'No contact info'}
              </div>
              <div style={{ fontSize: '.8rem', color: '#374151', marginTop: '.35rem' }}>
                Checking out <strong>{reservationInfo.reservation.checkOutDate}</strong>
              </div>
              <button
                className="btn-ghost"
                style={{ width: '100%', marginTop: '.7rem', background: '#fff' }}
                onClick={() => onMoveGuest(reservationInfo.reservation)}
              >
                🔁 Move Guest to Another Room
              </button>
            </div>
          )}

          {/* Upcoming reservation (Reserved) */}
          {reservationInfo?.kind === 'reserved' && (
            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 10, padding: '.9rem 1rem' }}>
              <div style={{ fontSize: '.67rem', fontWeight: 700, color: '#6d28d9', textTransform: 'uppercase', marginBottom: '.4rem' }}>
                Upcoming Reservation
              </div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{reservationInfo.reservation.guestName}</div>
              <div style={{ fontSize: '.8rem', color: '#374151', marginTop: '.35rem' }}>
                Arriving <strong>{reservationInfo.reservation.checkInDate}</strong>
              </div>
              {reservationInfo.reservation.checkInDate > TODAY ? (
                <div style={{ fontSize: '.78rem', color: '#92400e', background: '#fef9c3', borderRadius: 7, padding: '.4rem .6rem', marginTop: '.6rem' }}>
                  ⏳ Check-in not yet available (scheduled for {reservationInfo.reservation.checkInDate})
                </div>
              ) : (
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '.7rem' }}
                  disabled={checkingIn}
                  onClick={handleCheckIn}
                >
                  {checkingIn ? 'Checking in…' : '✓ Check In Guest Now'}
                </button>
              )}
            </div>
          )}

          {/* Fully free room — quick booking shortcut */}
          {!reservationInfo && room.status === 'Available' && (
            <button
              className="btn-ghost"
              style={{ width: '100%', background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe' }}
              onClick={() => onBookRoom(room)}
            >
              + New Reservation for This Room
            </button>
          )}

          <div className="edit-room-info-row">
            <div className="edit-room-info-item">
              <span className="edit-room-info-label">EFFECTIVE PRICE</span>
              <span className="edit-room-info-value">₹{room.effectivePrice?.toLocaleString()}</span>
            </div>
            <div className="edit-room-info-item">
              <span className="edit-room-info-label">BASE PRICE</span>
              <span className="edit-room-info-value">₹{room.basePrice?.toLocaleString()}</span>
            </div>
            <div className="edit-room-info-item">
              <span className="edit-room-info-label">CAPACITY</span>
              <span className="edit-room-info-value">{room.capacity} guests</span>
            </div>
          </div>

          <div className="modal-field">
            <label>STATUS</label>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="modal-field">
            <label>PRICE OVERRIDE (OPTIONAL)</label>
            <div className="input-prefix-wrap">
              <span className="input-prefix">₹</span>
              <input
                type="number" min="0"
                placeholder={String(room.basePrice)}
                value={price}
                onChange={e => setPrice(e.target.value)}
                style={{ paddingLeft: '1.8rem' }}
              />
            </div>
            <p className="text-muted text-sm" style={{ marginTop: '.25rem' }}>
              {price !== ''
                ? `Override active — effective: ₹${Number(price).toLocaleString()}`
                : `No override — using base price: ₹${room.basePrice?.toLocaleString()}`}
            </p>
          </div>

          <div className="edit-room-actions">
            {!confirm ? (
              <>
                <button className="edit-room-delete-btn" onClick={() => setConfirm(true)}>
                  <Trash2 size={14} /> Delete
                </button>
                <button className="btn-primary" style={{ flex: 2 }} disabled={loading} onClick={handleSave}>
                  {loading ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setConfirm(false)}>Cancel</button>
                <button className="edit-room-confirm-delete" disabled={loading} onClick={handleDelete}>
                  {loading ? 'Deleting…' : 'Confirm Delete'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Room Card ───────────────────────────────────────── */
function RoomCard({ room, reservationInfo, onClick }) {
  const displayStatus = reservationInfo?.kind === 'reserved' ? 'Reserved' : room.status;
  const s = ROOM_STATUS[displayStatus] ?? ROOM_STATUS.Available;
  return (
    <div
      className="room-card"
      style={{ background: s.bg, borderColor: s.border }}
      title={`Room ${room.roomNumber} — ${displayStatus}`}
      onClick={() => onClick(room)}
    >
      <div className="room-card-number">{room.roomNumber}</div>
      <div className="room-card-status" style={{ color: s.text }}>{s.label}</div>
      <div className="room-card-type">{room.roomTypeName}</div>
      {reservationInfo && (
        <div style={{ fontSize: '.65rem', color: s.text, fontWeight: 600, marginTop: '.2rem', opacity: .85 }}>
          {reservationInfo.reservation.guestName}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────── */
// Shared between Admin ("/admin/rooms") and Manager ("/manager/rooms").
// Creating new rooms/room types ("+ Add Inventory") is Admin-only —
// Managers can only view, change status, assign, and move guests.
export default function RoomInventory() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.[0] === 'Admin';

  const [rooms,       setRooms]       = useState([]);
  const [reservations, setReservations] = useState([]);
  const [hotels,      setHotels]      = useState([]);
  const [hotelId,     setHotelId]     = useState('');
  const [activeFloor, setActiveFloor] = useState('All Floors');
  const [filterType,  setFilterType]  = useState('All Types');
  const [showModal,   setShowModal]   = useState(false);
  const [editRoom,    setEditRoom]    = useState(null);
  const [moveGuestTarget, setMoveGuestTarget] = useState(null); // reservation
  const [bookRoomTarget,  setBookRoomTarget]  = useState(null); // room

  const [availCheckIn,  setAvailCheckIn]  = useState(TODAY);
  const [availCheckOut, setAvailCheckOut] = useState(TOMORROW);
  const [availResults,  setAvailResults]  = useState(null); // null = not checked yet
  const [availLoading,  setAvailLoading]  = useState(false);
  const [availError,    setAvailError]    = useState('');

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
      else if (h.length > 1) setHotelId('all');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setRooms([]); setReservations([]); return; }
    const targetHotelId = hotelId === 'all' ? undefined : Number(hotelId);
    roomService.getRooms(targetHotelId).then(setRooms).catch(() => {});
    reservationService.getAll(hotelId === 'all' ? {} : { hotelId }).then(setReservations).catch(() => {});
    setAvailResults(null);
  }, [hotelId]);

  const roomReservationMap = useMemo(() => {
    const map = {};
    reservations.forEach(r => {
      if (r.status === 'CheckedIn') {
        map[r.roomId] = { kind: 'occupied', reservation: r };
      } else if (r.status === 'Confirmed' || r.status === 'Pending') {
        const existing = map[r.roomId];
        if (!existing || existing.kind !== 'occupied') {
          if (!existing || r.checkInDate < existing.reservation.checkInDate) {
            map[r.roomId] = { kind: 'reserved', reservation: r };
          }
        }
      }
    });
    return map;
  }, [reservations]);

  const checkAvailability = async () => {
    if (!hotelId || !availCheckIn || !availCheckOut || availCheckOut <= availCheckIn) {
      setAvailError('Select a valid date range.'); return;
    }
    setAvailLoading(true); setAvailError(''); setAvailResults(null);
    try {
      const list = await roomService.getAvailable(Number(hotelId), availCheckIn, availCheckOut);
      setAvailResults(list);
    } catch (e) { setAvailError(e.message); }
    finally { setAvailLoading(false); }
  };

  /* ── Stats ────────────────────────────────────────── */
  const occupied  = rooms.filter(r => r.status === 'Occupied').length;
  const dirty     = rooms.filter(r => r.status === 'Dirty').length;
  const oos       = rooms.filter(r => r.status === 'Maintenance' || r.status === 'OutOfService').length;
  const total     = rooms.length;
  const occupancy = total ? ((occupied / total) * 100).toFixed(1) : null;

  /* ── Unique room types ────────────────────────────── */
  const roomTypeNames = useMemo(() =>
    [...new Set(rooms.map(r => r.roomTypeName).filter(Boolean))].sort()
  , [rooms]);

  /* ── Filtered rooms (by type) ───────────────────────── */
  const filteredRooms = useMemo(() =>
    filterType === 'All Types' ? rooms : rooms.filter(r => r.roomTypeName === filterType)
  , [rooms, filterType]);

  /* ── Group by floor ────────────────────────────────── */
  const floors = useMemo(() => {
    const map = {};
    filteredRooms.forEach(r => {
      const key = hotelId === 'all'
        ? `${r.hotelName ?? 'Hotel'} · ${r.floor || 'Floor 1'}`
        : (r.floor || 'Floor 1');
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  }, [filteredRooms, hotelId]);

  const floorNames    = floors.map(([name]) => name);
  const visibleFloors = activeFloor === 'All Floors'
    ? floors
    : floors.filter(([name]) => name === activeFloor);

  /* ── Callbacks ─────────────────────────────────────── */
  const handleSaved       = (newRooms) => setRooms(prev => [...prev, ...newRooms]);
  const handleRoomUpdated = (updated)  => setRooms(prev => prev.map(r => r.roomId === updated.roomId ? updated : r));
  const handleRoomDeleted = (roomId)   => setRooms(prev => prev.filter(r => r.roomId !== roomId));

  const handleReservationUpdated = (updated) => {
    setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));
    // Room statuses may have shifted (old room freed, new room occupied) — refresh.
    if (hotelId) roomService.getRooms(Number(hotelId)).then(setRooms).catch(() => {});
  };

  const handleCheckInGuest = async (reservation) => {
    const updated = await reservationService.checkIn(reservation.reservationId);
    handleReservationUpdated(updated);
  };

  return (
    <>
      <TopBar
        title="Room Inventory Management"
        actionLabel={isAdmin ? '+ Add Inventory' : undefined}
        onAction={isAdmin ? () => setShowModal(true) : undefined}
      />

      <div className="page-content">
        {/* Hotel picker */}
        {hotels.length > 1 && (
          <div style={{ marginBottom: '1rem', maxWidth: 280 }}>
            <select
              className="rx-select"
              value={hotelId}
              onChange={e => { setHotelId(e.target.value); setActiveFloor('All Floors'); setFilterType('All Types'); }}
            >
              <option value="all">All Hotels</option>
              {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          </div>
        )}

        {/* Stats */}
        <div className="mgr-metrics" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <div className="mgr-metric-card">
            <div className="mgr-metric-label">OCCUPANCY RATE</div>
            <div className="mgr-metric-row">
              <span className="mgr-metric-value" style={{ color: '#1d4ed8' }}>
                {occupancy !== null ? `${occupancy}%` : '—'}
              </span>
            </div>
            <div className="mgr-metric-sub" style={{ color: occupancy !== null ? '#16a34a' : '#9ca3af' }}>
              {occupancy !== null ? `${occupied} of ${total} rooms` : 'No rooms yet'}
            </div>
          </div>
          <div className="mgr-metric-card">
            <div className="mgr-metric-label">DIRTY BACKLOG</div>
            <div className="mgr-metric-row">
              <span className="mgr-metric-value" style={{ color: dirty > 0 ? '#ea580c' : '#9ca3af' }}>
                {dirty > 0 ? `${dirty} Rooms` : '—'}
              </span>
            </div>
            <div className="mgr-metric-sub">{dirty > 0 ? 'Needs housekeeping' : 'No dirty rooms'}</div>
          </div>
          <div className="mgr-metric-card">
            <div className="mgr-metric-label">OOS / MAINTENANCE</div>
            <div className="mgr-metric-row">
              <span className="mgr-metric-value" style={{ color: oos > 0 ? '#dc2626' : '#9ca3af' }}>
                {oos > 0 ? oos : '—'}
              </span>
            </div>
            <div className="mgr-metric-sub">{oos > 0 ? 'Out of service' : 'None out of service'}</div>
          </div>
          <div className="mgr-metric-card">
            <div className="mgr-metric-label">TOTAL ROOMS</div>
            <div className="mgr-metric-row">
              <span className="mgr-metric-value" style={{ color: '#374151' }}>{total || '—'}</span>
            </div>
            <div className="mgr-metric-sub">{total > 0 ? `${total - occupied - oos} available` : 'No rooms added'}</div>
          </div>
        </div>

        {/* Room Availability Checker */}
        <div className="card" style={{ padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.92rem', color: '#111827', marginBottom: '.75rem' }}>
            Check Room Availability
          </div>
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <label style={{ fontSize: '.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Check-In</label>
              <input type="date" value={availCheckIn} min={TODAY}
                onChange={e => setAvailCheckIn(e.target.value)}
                style={{ padding: '.5rem .7rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.85rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
              <label style={{ fontSize: '.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Check-Out</label>
              <input type="date" value={availCheckOut} min={availCheckIn}
                onChange={e => setAvailCheckOut(e.target.value)}
                style={{ padding: '.5rem .7rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.85rem' }} />
            </div>
            <button className="btn-primary" disabled={!hotelId || hotelId === 'all' || availLoading} onClick={checkAvailability}>
              {availLoading ? 'Checking…' : 'Check Availability'}
            </button>
          </div>
          {hotelId === 'all' && (
            <div className="text-muted text-sm" style={{ marginTop: '.5rem' }}>Select a specific hotel to check availability.</div>
          )}
          {availError && <div className="error-msg" style={{ marginTop: '.6rem' }}>{availError}</div>}
          {availResults !== null && (
            <div style={{ marginTop: '.9rem' }}>
              <div style={{ fontSize: '.82rem', color: '#374151', marginBottom: '.5rem' }}>
                <strong>{availResults.length}</strong> room{availResults.length !== 1 ? 's' : ''} available for {availCheckIn} → {availCheckOut}
              </div>
              {availResults.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                  {availResults.map(r => (
                    <span key={r.roomId} style={{
                      background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a',
                      borderRadius: 7, padding: '.3rem .65rem', fontSize: '.8rem', fontWeight: 700,
                    }}>
                      Room {r.roomNumber} · ₹{r.effectivePrice?.toLocaleString()}/night
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Room Type Filter */}
        {roomTypeNames.length > 0 && (
          <div className="room-type-filter">
            {['All Types', ...roomTypeNames].map(t => (
              <button
                key={t}
                className={`room-type-btn${filterType === t ? ' active' : ''}`}
                onClick={() => { setFilterType(t); setActiveFloor('All Floors'); }}
              >
                {t}
                {t !== 'All Types' && (
                  <span className="room-type-count">
                    {rooms.filter(r => r.roomTypeName === t).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Floor tabs + legend */}
        <div className="room-inv-toolbar">
          <div className="room-floor-tabs">
            {['All Floors', ...floorNames].map(f => (
              <button
                key={f}
                className={`room-floor-tab${activeFloor === f ? ' active' : ''}`}
                onClick={() => setActiveFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="room-legend">
            {LEGEND.map(l => (
              <span key={l.key} className="room-legend-item">
                <span className="room-legend-dot" style={{ background: l.dot }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {rooms.length > 0 && (
          <p className="text-muted text-sm" style={{ marginBottom: '.75rem' }}>
            Click any room card to edit its status or price.
          </p>
        )}

        {/* Floor grids */}
        {rooms.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            No rooms added yet. Click <strong>+ Add Inventory</strong> to get started.
          </div>
        ) : visibleFloors.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '2rem' }}>No rooms match the current filter.</div>
        ) : (
          visibleFloors.map(([floorName, floorRooms]) => (
            <div key={floorName} className="floor-section">
              <div className="floor-label">{floorName}</div>
              <div className="rooms-grid">
                {floorRooms.map(r => (
                  <RoomCard key={r.roomId} room={r} reservationInfo={roomReservationMap[r.roomId]} onClick={setEditRoom} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <AddInventoryModal
          onClose={() => setShowModal(false)}
          onSaved={(newRooms) => { handleSaved(newRooms); setShowModal(false); }}
        />
      )}

      {editRoom && (
        <EditRoomModal
          room={editRoom}
          reservationInfo={roomReservationMap[editRoom.roomId]}
          onClose={() => setEditRoom(null)}
          onSaved={handleRoomUpdated}
          onDeleted={handleRoomDeleted}
          onMoveGuest={(reservation) => { setEditRoom(null); setMoveGuestTarget(reservation); }}
          onCheckInGuest={handleCheckInGuest}
          onBookRoom={(room) => { setEditRoom(null); setBookRoomTarget(room); }}
        />
      )}

      {moveGuestTarget && (
        <ChangeRoomModal
          reservation={moveGuestTarget}
          onClose={() => setMoveGuestTarget(null)}
          onSaved={(updated) => { handleReservationUpdated(updated); setMoveGuestTarget(null); }}
        />
      )}

      {bookRoomTarget && (
        <NewReservationModal
          presetHotelId={Number(hotelId)}
          presetRoomId={bookRoomTarget.roomId}
          onClose={() => setBookRoomTarget(null)}
          onSaved={() => {
            setBookRoomTarget(null);
            reservationService.getAll({ hotelId }).then(setReservations).catch(() => {});
            roomService.getRooms(Number(hotelId)).then(setRooms).catch(() => {});
          }}
        />
      )}
    </>
  );
}

