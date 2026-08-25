import { useState, useMemo, useEffect, useRef } from 'react';
import TopBar from '../TopBar';
import { roomService } from '../../services/roomService';
import { hotelService } from '../../services/hotelService';
import './HousekeepingRoomStatus.css';

/* ── Status config ─────────────────────────────────────────────── */
const STATUS_META = {
  Dirty:        { label: 'DIRTY',        cls: 'hkr-dirty',       dot: '#c8a882' },
  Cleaning:     { label: 'CLEANING',     cls: 'hkr-cleaning',    dot: '#bfa76e' },
  Available:    { label: 'READY',        cls: 'hkr-ready',       dot: '#7aab8a' },
  Occupied:     { label: 'OCCUPIED',     cls: 'hkr-occupied',    dot: '#7a9fc4' },
  Maintenance:  { label: 'MAINTENANCE',  cls: 'hkr-maintenance', dot: '#c49090' },
  OutOfService: { label: 'OUT OF SVC',   cls: 'hkr-oos',         dot: '#b0b5be' },
};

/* ── Room Card ─────────────────────────────────────────────────── */
function RoomCard({ room, isBeingCleaned, onStartCleaning, onFinishCleaning, onMarkDirty, onMarkReady, busy }) {
  const { status, roomNumber, roomTypeName, floor } = room;
  const displayStatus = isBeingCleaned ? 'Cleaning' : status;
  const meta = STATUS_META[displayStatus] || STATUS_META.Available;

  /* ── progress bar for "Cleaning" ── */
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isBeingCleaned) {
      setProgress(0);
      intervalRef.current = setInterval(() => {
        setProgress(p => (p >= 90 ? 90 : p + 2));
      }, 800);
    } else {
      clearInterval(intervalRef.current);
      setProgress(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isBeingCleaned]);

  return (
    <div className={`hkr-card hkr-card--${meta.cls.replace('hkr-', '')}`}>
      {/* status badge */}
      <div className={`hkr-badge ${meta.cls}`}>{meta.label}</div>

      {/* room info */}
      <div className="hkr-card-body">
        <div className="hkr-room-number">Room {roomNumber}</div>
        <div className="hkr-room-type">{roomTypeName} &middot; {floor}</div>

        {/* Cleaning progress */}
        {isBeingCleaned && (
          <div className="hkr-progress-wrap">
            <div className="hkr-progress-track">
              <div className="hkr-progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <div className="hkr-assigned-text">In progress…</div>
          </div>
        )}

        {/* Available → last cleaned indicator */}
        {status === 'Available' && !isBeingCleaned && (
          <div className="hkr-verified-text">✓ Verified Clean</div>
        )}

        {/* Maintenance issue label */}
        {status === 'Maintenance' && (
          <div className="hkr-maintenance-lbl">🔧 Maintenance Required</div>
        )}

        {/* OOS label */}
        {status === 'OutOfService' && (
          <div className="hkr-maintenance-lbl">⛔ Out of Service</div>
        )}
      </div>

      {/* action area */}
      <div className="hkr-action-area">
        {/* Dirty → Start Cleaning */}
        {status === 'Dirty' && !isBeingCleaned && (
          <button
            className="hkr-btn hkr-btn--start"
            disabled={busy}
            onClick={() => onStartCleaning(room.roomId)}
          >
            Start Cleaning
          </button>
        )}

        {/* Cleaning → Finish Cleaning */}
        {isBeingCleaned && (
          <button
            className="hkr-btn hkr-btn--finish"
            disabled={busy}
            onClick={() => onFinishCleaning(room.roomId)}
          >
            Finish Cleaning
          </button>
        )}

        {/* Available → Mark Dirty */}
        {status === 'Available' && !isBeingCleaned && (
          <button
            className="hkr-btn hkr-btn--dirty"
            disabled={busy}
            onClick={() => onMarkDirty(room.roomId)}
          >
            Mark as Dirty
          </button>
        )}

        {/* Maintenance → Mark Ready */}
        {status === 'Maintenance' && (
          <button
            className="hkr-btn hkr-btn--ready"
            disabled={busy}
            onClick={() => onMarkReady(room.roomId)}
          >
            Mark as Ready
          </button>
        )}

        {/* OutOfService → Mark Ready */}
        {status === 'OutOfService' && (
          <button
            className="hkr-btn hkr-btn--ready"
            disabled={busy}
            onClick={() => onMarkReady(room.roomId)}
          >
            Back to Service
          </button>
        )}

        {/* Occupied → no action */}
        {status === 'Occupied' && (
          <span className="hkr-no-action">Do not disturb</span>
        )}
      </div>
    </div>
  );
}

/* ── Floor Overview Dot ────────────────────────────────────────── */
function FloorDot({ room, isBeingCleaned }) {
  const displayStatus = isBeingCleaned ? 'Cleaning' : room.status;
  const dot = STATUS_META[displayStatus]?.dot ?? '#9ca3af';
  return (
    <div
      className="hkr-floor-dot"
      title={`Room ${room.roomNumber} — ${displayStatus}`}
      style={{ background: dot }}
    >
      {room.roomNumber}
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */
export default function HousekeepingRoomStatus() {
  const [hotels,          setHotels]          = useState([]);
  const [hotelId,         setHotelId]         = useState('');
  const [rooms,           setRooms]           = useState([]);
  const [activeFloor,     setActiveFloor]     = useState('All Floors');
  const [cleaningRoomIds, setCleaningRoomIds] = useState(new Set());
  const [busyId,          setBusyId]          = useState(null);
  const [loading,         setLoading]         = useState(false);

  /* load hotels */
  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  /* load rooms */
  useEffect(() => {
    if (!hotelId) { setRooms([]); return; }
    setLoading(true);
    roomService.getRooms(Number(hotelId))
      .then(r => { setRooms(r); setLoading(false); })
      .catch(() => setLoading(false));
  }, [hotelId]);

  /* group rooms by floor */
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

  /* stats */
  const counts = useMemo(() => ({
    dirty:       rooms.filter(r => r.status === 'Dirty').length,
    cleaning:    cleaningRoomIds.size,
    ready:       rooms.filter(r => r.status === 'Available').length,
    occupied:    rooms.filter(r => r.status === 'Occupied').length,
    maintenance: rooms.filter(r => r.status === 'Maintenance' || r.status === 'OutOfService').length,
  }), [rooms, cleaningRoomIds]);

  /* ── handlers ── */
  const handleStartCleaning = (roomId) => {
    setCleaningRoomIds(prev => new Set([...prev, roomId]));
  };

  const handleFinishCleaning = async (roomId) => {
    setBusyId(roomId);
    try {
      const updated = await roomService.updateRoom(roomId, { status: 'Available' });
      setRooms(prev => prev.map(r => r.roomId === updated.roomId ? { ...r, ...updated } : r));
      setCleaningRoomIds(prev => { const s = new Set(prev); s.delete(roomId); return s; });
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const handleMarkDirty = async (roomId) => {
    setBusyId(roomId);
    try {
      const updated = await roomService.updateRoom(roomId, { status: 'Dirty' });
      setRooms(prev => prev.map(r => r.roomId === updated.roomId ? { ...r, ...updated } : r));
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const handleMarkReady = async (roomId) => {
    setBusyId(roomId);
    try {
      const updated = await roomService.updateRoom(roomId, { status: 'Available' });
      setRooms(prev => prev.map(r => r.roomId === updated.roomId ? { ...r, ...updated } : r));
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <TopBar title="Room Inventory" subtitle="Update cleaning status and manage room readiness." />

      <div className="page-content hkr-page">

        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select
            className="hkr-hotel-select"
            value={hotelId}
            onChange={e => { setHotelId(e.target.value); setActiveFloor('All Floors'); }}
          >
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Stats bar */}
        <div className="hkr-stats">
          <div className="hkr-stat hkr-stat--dirty">
            <span className="hkr-stat-dot" style={{ background: '#c8a882' }} />
            <span className="hkr-stat-num">{counts.dirty}</span>
            <span className="hkr-stat-lbl">Needs Cleaning</span>
          </div>
          <div className="hkr-stat hkr-stat--cleaning">
            <span className="hkr-stat-dot" style={{ background: '#bfa76e' }} />
            <span className="hkr-stat-num">{counts.cleaning}</span>
            <span className="hkr-stat-lbl">Being Cleaned</span>
          </div>
          <div className="hkr-stat hkr-stat--ready">
            <span className="hkr-stat-dot" style={{ background: '#7aab8a' }} />
            <span className="hkr-stat-num">{counts.ready}</span>
            <span className="hkr-stat-lbl">Ready</span>
          </div>
          <div className="hkr-stat hkr-stat--occupied">
            <span className="hkr-stat-dot" style={{ background: '#7a9fc4' }} />
            <span className="hkr-stat-num">{counts.occupied}</span>
            <span className="hkr-stat-lbl">Occupied</span>
          </div>
          <div className="hkr-stat hkr-stat--maintenance">
            <span className="hkr-stat-dot" style={{ background: '#c49090' }} />
            <span className="hkr-stat-num">{counts.maintenance}</span>
            <span className="hkr-stat-lbl">Maintenance</span>
          </div>
        </div>

        {/* Floor tabs */}
        {rooms.length > 0 && (
          <div className="hkr-floor-tabs">
            {['All Floors', ...floorNames].map(f => (
              <button
                key={f}
                className={`hkr-floor-tab${activeFloor === f ? ' active' : ''}`}
                onClick={() => setActiveFloor(f)}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Empty / loading states */}
        {!hotelId && (
          <div className="hkr-empty">Select a hotel to view room status.</div>
        )}
        {hotelId && loading && (
          <div className="hkr-empty">Loading rooms…</div>
        )}
        {hotelId && !loading && rooms.length === 0 && (
          <div className="hkr-empty">No rooms found for this hotel.</div>
        )}

        {/* Featured room cards — Dirty + Cleaning first, then Maintenance */}
        {!loading && rooms.length > 0 && (
          <div className="hkr-featured-grid">
            {rooms
              .filter(r =>
                cleaningRoomIds.has(r.roomId) ||
                r.status === 'Dirty' ||
                r.status === 'Maintenance' ||
                r.status === 'OutOfService'
              )
              .map(room => (
                <RoomCard
                  key={room.roomId}
                  room={room}
                  isBeingCleaned={cleaningRoomIds.has(room.roomId)}
                  onStartCleaning={handleStartCleaning}
                  onFinishCleaning={handleFinishCleaning}
                  onMarkDirty={handleMarkDirty}
                  onMarkReady={handleMarkReady}
                  busy={busyId === room.roomId}
                />
              ))}
          </div>
        )}

        {/* Floor-by-floor overview */}
        {!loading && rooms.length > 0 && (
          <div className="hkr-floor-overview-card">
            <div className="hkr-floor-overview-title">Floor Overview</div>

            {/* legend */}
            <div className="hkr-legend">
              {Object.entries(STATUS_META).map(([key, { label, dot }]) => (
                <span key={key} className="hkr-legend-item">
                  <span className="hkr-legend-dot" style={{ background: dot }} />
                  {label}
                </span>
              ))}
            </div>

            {/* floor sections */}
            {visibleFloors.map(([floorName, floorRooms]) => (
              <div key={floorName} className="hkr-floor-section">
                <div className="hkr-floor-label">{floorName}</div>
                <div className="hkr-dots-grid">
                  {floorRooms.map(room => (
                    <FloorDot
                      key={room.roomId}
                      room={room}
                      isBeingCleaned={cleaningRoomIds.has(room.roomId)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
