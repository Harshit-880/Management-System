import { useState, useMemo, useEffect } from 'react';
import TopBar from '../TopBar';
import { roomService } from '../../services/roomService';
import { reservationService } from '../../services/reservationService';
import { hotelService } from '../../services/hotelService';
import './RoomStatus.css';

const TODAY    = new Date().toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function fmtDate(d) {
  if (!d) return '';
  if (d === TODAY)    return 'Today';
  if (d === TOMORROW) return 'Tomorrow';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ── Room Card ────────────────────────────────────────────────── */
function RoomCard({ room, reservation, onCheckIn, busy }) {
  const { status, roomNumber, roomTypeName } = room;

  const isOccupied     = status === 'Occupied';
  const isDirty        = status === 'Dirty';
  const isMaintenance  = status === 'Maintenance';
  const isOOS          = status === 'OutOfService';
  const isReady        = status === 'Available' && reservation &&
    (reservation.status === 'Confirmed' || reservation.status === 'Pending');

  let cardClass = 'rs-card';
  if (isOccupied)    cardClass += ' rs-card--occupied';
  if (isDirty)       cardClass += ' rs-card--dirty';
  if (isMaintenance) cardClass += ' rs-card--maintenance';
  if (isOOS)         cardClass += ' rs-card--oos';
  if (isReady)       cardClass += ' rs-card--ready';

  const dotClass = `rs-dot rs-dot--${status.toLowerCase()}`;

  return (
    <div className={cardClass}>
      {/* IN HOUSE top banner */}
      {isOccupied && <div className="rs-inhouse-banner">IN HOUSE</div>}

      <div className="rs-card-inner">
        {/* Number + dot */}
        <div className="rs-card-top">
          <span className="rs-card-number">{roomNumber}</span>
          <span className={dotClass} />
        </div>

        {/* Type */}
        <div className="rs-card-type">{roomTypeName || 'ROOM'}</div>

        {/* State body */}
        {isOccupied && reservation && (
          <div className="rs-card-body">
            <div className="rs-guest-name">{reservation.guestName}</div>
            <div className="rs-checkout-row">
              <span className="rs-checkout-label">CHECKOUT</span>
              <span className={`rs-checkout-date${reservation.checkOutDate === TODAY ? ' urgent' : reservation.checkOutDate === TOMORROW ? ' soon' : ''}`}>
                {fmtDate(reservation.checkOutDate)}
              </span>
            </div>
          </div>
        )}

        {isReady && (
          <div className="rs-card-body">
            <div className="rs-ready-text">Ready for Check-in</div>
            <button
              className="rs-checkin-btn"
              disabled={busy}
              onClick={() => onCheckIn(reservation.reservationId)}
            >
              CHECK IN
            </button>
          </div>
        )}

        {isDirty && (
          <div className="rs-card-body">
            <div className="rs-dirty-text">Housekeeping Needed</div>
            <div className="rs-dirty-bar" />
            <div className="rs-assigned">ASSIGNED: —</div>
          </div>
        )}

        {isMaintenance && (
          <div className="rs-card-body">
            <div className="rs-maintenance-text">Under Maintenance</div>
            <button className="rs-logs-btn">VIEW LOGS</button>
          </div>
        )}

        {isOOS && (
          <div className="rs-card-body">
            <div className="rs-oos-text">Out of Service</div>
            <button className="rs-logs-btn">VIEW LOGS</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function RoomStatus() {
  const [rooms,        setRooms]        = useState([]);
  const [hotels,       setHotels]       = useState([]);
  const [hotelId,      setHotelId]      = useState('');
  const [reservations, setReservations] = useState([]);
  const [activeFloor,  setActiveFloor]  = useState('All Floors');
  const [busyId,       setBusyId]       = useState(null);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setRooms([]); setReservations([]); return; }
    Promise.all([
      roomService.getRooms(Number(hotelId)),
      reservationService.getAll({ hotelId }),
    ]).then(([r, res]) => { setRooms(r); setReservations(res); })
      .catch(() => {});
  }, [hotelId]);

  /* ── Room → reservation map ────────────────────────────── */
  const roomResMap = useMemo(() => {
    const today  = {};
    const active = {};
    reservations.forEach(r => {
      if (r.status === 'CheckedIn')
        active[r.roomId] = r;
      if ((r.status === 'Confirmed' || r.status === 'Pending') && r.checkInDate === TODAY)
        today[r.roomId] = r;
    });
    return { ...today, ...active }; // active (CheckedIn) takes priority
  }, [reservations]);

  /* ── Group by floor ────────────────────────────────────── */
  const floors = useMemo(() => {
    const map = {};
    rooms.forEach(r => {
      const key = r.floor || 'Floor 1';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true }));
  }, [rooms]);

  const floorNames    = floors.map(([n]) => n);
  const visibleFloors = activeFloor === 'All Floors'
    ? floors
    : floors.filter(([n]) => n === activeFloor);

  /* ── Stats for legend ──────────────────────────────────── */
  const counts = useMemo(() => ({
    available:   rooms.filter(r => r.status === 'Available').length,
    occupied:    rooms.filter(r => r.status === 'Occupied').length,
    dirty:       rooms.filter(r => r.status === 'Dirty').length,
    maintenance: rooms.filter(r => r.status === 'Maintenance' || r.status === 'OutOfService').length,
  }), [rooms]);

  /* ── Check-in handler ──────────────────────────────────── */
  const handleCheckIn = async (reservationId) => {
    setBusyId(reservationId);
    try {
      const updated = await reservationService.checkIn(reservationId);
      setReservations(prev =>
        prev.map(r => r.reservationId === updated.reservationId ? updated : r));
      const updatedRooms = await roomService.getRooms(Number(hotelId));
      setRooms(updatedRooms);
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <TopBar
        title="Room Status"
        actionLabel="Bulk Update"
        onAction={() => {}}
      />

      <div className="page-content">
        {/* Hotel picker */}
        {hotels.length > 1 && (
          <select
            className="rs-hotel-select"
            value={hotelId}
            onChange={e => { setHotelId(e.target.value); setActiveFloor('All Floors'); }}
          >
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Toolbar: floor tabs + legend */}
        <div className="rs-toolbar">
          <div className="rs-floor-tabs">
            {['All Floors', ...floorNames].map(f => (
              <button
                key={f}
                className={`rs-floor-tab${activeFloor === f ? ' active' : ''}`}
                onClick={() => setActiveFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="rs-legend">
            <span className="rs-legend-item">
              <span className="rs-legend-dot available" /> AVAILABLE ({counts.available})
            </span>
            <span className="rs-legend-item">
              <span className="rs-legend-dot occupied" /> OCCUPIED ({counts.occupied})
            </span>
            <span className="rs-legend-item">
              <span className="rs-legend-dot dirty" /> DIRTY ({counts.dirty})
            </span>
            <span className="rs-legend-item">
              <span className="rs-legend-dot maintenance" /> MAINTENANCE ({counts.maintenance})
            </span>
          </div>
        </div>

        {/* Grid */}
        {rooms.length === 0 ? (
          <div className="empty-state" style={{ marginTop: '3rem' }}>
            {hotelId
              ? 'No rooms found. Add rooms in Room Inventory first.'
              : 'Select a hotel to view room status.'}
          </div>
        ) : (
          visibleFloors.map(([floorName, floorRooms]) => (
            <div key={floorName} className="rs-floor-section">
              <div className="rs-floor-label">{floorName}</div>
              <div className="rs-grid">
                {floorRooms.map(room => (
                  <RoomCard
                    key={room.roomId}
                    room={room}
                    reservation={roomResMap[room.roomId]}
                    onCheckIn={handleCheckIn}
                    busy={busyId === roomResMap[room.roomId]?.reservationId}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
