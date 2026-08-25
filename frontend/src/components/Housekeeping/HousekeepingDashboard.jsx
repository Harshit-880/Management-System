import { useState, useEffect } from 'react';
import TopBar from '../TopBar';
import { roomService } from '../../services/roomService';
import { serviceRequestService } from '../../services/serviceRequestService';
import { hotelService } from '../../services/hotelService';
import './HousekeepingDashboard.css';

const TODAY = new Date().toISOString().slice(0, 10);

const DEPT_COLOR = {
  Housekeeping: '#7c3aed',
  Maintenance:  '#d97706',
  RoomService:  '#0891b2',
  Other:        '#6b7280',
};
const STATUS_COLOR = {
  Pending:    '#f59e0b',
  Assigned:   '#3b82f6',
  InProgress: '#8b5cf6',
  Completed:  '#10b981',
  Archived:   '#9ca3af',
};

export default function HousekeepingDashboard({ hideTopBar = false }) {
  const [hotels,   setHotels]   = useState([]);
  const [hotelId,  setHotelId]  = useState('');
  const [rooms,    setRooms]    = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([
      roomService.getRooms(Number(hotelId)),
      serviceRequestService.getAll({ hotelId }),
    ]).then(([r, sr]) => {
      setRooms(r);
      setRequests(sr);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotelId]);

  const dirty          = rooms.filter(r => r.status === 'Dirty');
  const inProgress     = requests.filter(r => r.status === 'Assigned' || r.status === 'InProgress');
  const completedToday = requests.filter(r =>
    r.status === 'Completed' && (r.updatedAt ?? r.createdAt)?.slice(0, 10) === TODAY
  );
  const guestRequests  = requests.filter(r =>
    (r.department === 'RoomService' || r.department === 'Other') && r.status === 'Pending'
  );
  const priorityRooms  = [...dirty, ...rooms.filter(r => r.status === 'Maintenance')];
  const activeRequests = requests.filter(r =>
    r.status === 'Pending' || r.status === 'Assigned' || r.status === 'InProgress'
  );

  return (
    <>
      {!hideTopBar && <TopBar title="Housekeeping" subtitle="Today's cleaning overview" />}
      <div className="page-content hk-page">

        {hotels.length > 1 && (
          <select className="hk-hotel-select" value={hotelId}
            onChange={e => setHotelId(e.target.value)}>
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Stats */}
        <div className="hk-stats">
          <div className="hk-stat hk-stat--red">
            <div className="hk-stat-icon">🧹</div>
            <div>
              <div className="hk-stat-num">{dirty.length}</div>
              <div className="hk-stat-lbl">Rooms to Clean</div>
            </div>
          </div>
          <div className="hk-stat hk-stat--blue">
            <div className="hk-stat-icon">⚙️</div>
            <div>
              <div className="hk-stat-num">{inProgress.length}</div>
              <div className="hk-stat-lbl">In Progress</div>
            </div>
          </div>
          <div className="hk-stat hk-stat--green">
            <div className="hk-stat-icon">✅</div>
            <div>
              <div className="hk-stat-num">{completedToday.length}</div>
              <div className="hk-stat-lbl">Completed Today</div>
            </div>
          </div>
          <div className="hk-stat hk-stat--orange">
            <div className="hk-stat-icon">🔔</div>
            <div>
              <div className="hk-stat-num">{guestRequests.length}</div>
              <div className="hk-stat-lbl">Guest Requests</div>
            </div>
          </div>
        </div>

        {!hotelId && (
          <div className="hk-empty-hint">Select a hotel to view today's housekeeping overview.</div>
        )}

        {hotelId && (
          <div className="hk-cols">
            {/* Priority rooms */}
            <div className="hk-card">
              <div className="hk-card-head">
                <h3>Priority Rooms</h3>
                <span className="hk-count-badge">{priorityRooms.length}</span>
              </div>
              {loading && <div className="hk-inner-empty">Loading…</div>}
              {!loading && priorityRooms.length === 0 && (
                <div className="hk-inner-empty">All rooms are clean ✓</div>
              )}
              {priorityRooms.map(r => (
                <div key={r.roomId} className="hk-room-row">
                  <div>
                    <div className="hk-room-num">Room {r.roomNumber}</div>
                    <div className="hk-room-type">{r.roomTypeName}</div>
                  </div>
                  <span className={`hk-status-pill hk-status-pill--${r.status.toLowerCase()}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Active service requests */}
            <div className="hk-card">
              <div className="hk-card-head">
                <h3>Active Requests</h3>
                <span className="hk-count-badge">{activeRequests.length}</span>
              </div>
              {loading && <div className="hk-inner-empty">Loading…</div>}
              {!loading && activeRequests.length === 0 && (
                <div className="hk-inner-empty">No active requests</div>
              )}
              {activeRequests.slice(0, 8).map(sr => (
                <div key={sr.requestId} className="hk-req-row">
                  <div className="hk-req-info">
                    <div className="hk-req-title">{sr.title}</div>
                    <div className="hk-req-meta">
                      {sr.roomNumber && <span>Room {sr.roomNumber}</span>}
                      <span style={{ color: DEPT_COLOR[sr.department] || '#6b7280' }}>
                        {sr.department}
                      </span>
                    </div>
                  </div>
                  <span className="hk-req-status" style={{ color: STATUS_COLOR[sr.status] }}>
                    {sr.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
