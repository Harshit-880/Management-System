import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, BedDouble, LogIn, LogOut, TrendingUp, DollarSign,
} from 'lucide-react';
import TopBar from './TopBar';
import StatsCard from './StatsCard';
import { hotelService } from '../services/hotelService';
import { roomService } from '../services/roomService';
import { reservationService } from '../services/reservationService';
import { serviceRequestService } from '../services/serviceRequestService';

const TODAY = new Date().toISOString().slice(0, 10);

const ROOM_STATUS_META = [
  { key: 'Available',    label: 'Available',     color: '#22c55e' },
  { key: 'Occupied',     label: 'Occupied',      color: '#3b82f6' },
  { key: 'Dirty',        label: 'Dirty',         color: '#f97316' },
  { key: 'Maintenance',  label: 'Maintenance',   color: '#ef4444' },
  { key: 'OutOfService', label: 'Out of Service', color: '#9ca3af' },
];

const RES_BADGE = {
  Pending:    'badge-yellow',
  Confirmed:  'badge-blue',
  CheckedIn:  'badge-green',
  CheckedOut: 'badge-gray',
  Cancelled:  'badge-red',
};

const SR_BADGE = {
  Pending:    'badge-yellow',
  Assigned:   'badge-blue',
  InProgress: 'badge-blue',
  Completed:  'badge-green',
  Archived:   'badge-gray',
};

function fmtCurrency(n) {
  return `₹${(n || 0).toLocaleString('en-IN')}`;
}

function computeHotelStats(rooms, reservations, requests) {
  const occupied  = rooms.filter(r => r.status === 'Occupied').length;
  const occupancyRate = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const checkInsToday  = reservations.filter(r => r.checkInDate === TODAY && r.status !== 'Cancelled').length;
  const checkOutsToday = reservations.filter(r => r.checkOutDate === TODAY && r.status !== 'Cancelled').length;
  const revenueToday = reservations
    .filter(r => r.checkOutDate === TODAY && r.status === 'CheckedOut')
    .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
  const pendingRequests = requests.filter(r => r.status === 'Pending').length;
  return { occupied, occupancyRate, checkInsToday, checkOutsToday, revenueToday, pendingRequests };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [hotels,   setHotels]   = useState([]);
  const [hotelId,  setHotelId]  = useState('all');
  const [perHotel, setPerHotel] = useState({}); // { [hotelId]: { rooms, reservations, requests } }
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    hotelService.getAll().then(setHotels).catch(() => {});
  }, []);

  useEffect(() => {
    if (hotels.length === 0) return;
    setLoading(true);
    Promise.all(hotels.map(h =>
      Promise.all([
        roomService.getRooms(h.hotelId),
        reservationService.getAll({ hotelId: h.hotelId }),
        serviceRequestService.getAll({ hotelId: h.hotelId }),
      ]).then(([rooms, reservations, requests]) => [h.hotelId, { rooms, reservations, requests }])
    )).then(entries => {
      setPerHotel(Object.fromEntries(entries));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotels]);

  /* ── Scope: selected hotel(s) combined data ── */
  const scoped = useMemo(() => {
    const ids = hotelId === 'all' ? hotels.map(h => h.hotelId) : [Number(hotelId)];
    const rooms        = [];
    const reservations = [];
    const requests     = [];
    ids.forEach(id => {
      const d = perHotel[id];
      if (!d) return;
      rooms.push(...d.rooms);
      reservations.push(...d.reservations);
      requests.push(...d.requests);
    });
    return { rooms, reservations, requests };
  }, [hotelId, hotels, perHotel]);

  const stats = useMemo(() => computeHotelStats(scoped.rooms, scoped.reservations, scoped.requests), [scoped]);

  const roomStatusCounts = useMemo(() => ROOM_STATUS_META.map(meta => ({
    ...meta,
    count: scoped.rooms.filter(r => r.status === meta.key).length,
  })), [scoped.rooms]);

  const recentReservations = useMemo(() =>
    [...scoped.reservations].sort((a, b) => b.reservationId - a.reservationId).slice(0, 5),
    [scoped.reservations]);

  const pendingRequests = useMemo(() =>
    scoped.requests.filter(r => r.status === 'Pending')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
    [scoped.requests]);

  const hotelWisePerformance = useMemo(() =>
    hotels.map(h => {
      const d = perHotel[h.hotelId] ?? { rooms: [], reservations: [], requests: [] };
      return { hotel: h, ...computeHotelStats(d.rooms, d.reservations, d.requests), totalRooms: d.rooms.length };
    }), [hotels, perHotel]);

  return (
    <>
      <TopBar title="Group Overview" subtitle="All hotels · today's performance" />
      <div className="page-content">
        {/* Portfolio banner + hotel selector */}
        <div className="portfolio-banner">
          <div className="portfolio-banner-text">
            <p className="banner-meta">Portfolio · {hotels.length} {hotels.length === 1 ? 'property' : 'properties'}</p>
            <h2 className="banner-value">Hotel Management</h2>
            <p className="banner-sub">Overview across all your properties</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/hotels')}>Manage Hotels</button>
        </div>

        {hotels.length > 1 && (
          <div style={{ margin: '1rem 0', maxWidth: 280 }}>
            <label style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: '.3rem' }}>
              Hotel
            </label>
            <select className="rx-select" style={{ marginBottom: 0 }} value={hotelId} onChange={e => setHotelId(e.target.value)}>
              <option value="all">All Hotels</option>
              {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          </div>
        )}

        {/* Stats Row */}
        <div className="stats-grid">
          <StatsCard icon={Building2}  label="TOTAL HOTELS"     value={hotels.length || '—'} sub={hotels.length ? `${hotels.length} active ${hotels.length === 1 ? 'property' : 'properties'}` : 'No properties added yet'} />
          <StatsCard icon={BedDouble}  label="TOTAL ROOMS"      value={loading ? '—' : scoped.rooms.length || '—'} sub={`${stats.occupied} occupied`} />
          <StatsCard icon={LogIn}      label="TODAY'S CHECK-INS"  value={loading ? '—' : stats.checkInsToday} sub="Scheduled arrivals today" />
          <StatsCard icon={LogOut}     label="TODAY'S CHECK-OUTS" value={loading ? '—' : stats.checkOutsToday} sub="Scheduled departures today" />
          <StatsCard icon={TrendingUp} label="OVERALL OCCUPANCY"  value={loading ? '—' : `${stats.occupancyRate}%`} sub={`${stats.occupied} of ${scoped.rooms.length} rooms`} />
          <StatsCard icon={DollarSign} label="TODAY'S REVENUE"    value={loading ? '—' : fmtCurrency(stats.revenueToday)} sub="From completed check-outs" />
        </div>

        {/* Hotel-wise performance */}
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Hotel-wise Performance</h3>
              <p className="card-sub">Occupancy and revenue breakdown per property</p>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>HOTEL</th>
                <th>ROOMS</th>
                <th>OCCUPANCY</th>
                <th>CHECK-INS TODAY</th>
                <th>CHECK-OUTS TODAY</th>
                <th>REVENUE TODAY</th>
                <th>PENDING REQUESTS</th>
              </tr>
            </thead>
            <tbody>
              {hotelWisePerformance.length === 0 ? (
                <tr><td colSpan={7} className="empty-state">No hotels added yet.</td></tr>
              ) : hotelWisePerformance.map(row => (
                <tr key={row.hotel.hotelId} style={{ cursor: 'pointer' }} onClick={() => setHotelId(String(row.hotel.hotelId))}>
                  <td className="fw-600">{row.hotel.hotelName}</td>
                  <td>{row.totalRooms}</td>
                  <td>{row.occupancyRate}%</td>
                  <td>{row.checkInsToday}</td>
                  <td>{row.checkOutsToday}</td>
                  <td>{fmtCurrency(row.revenueToday)}</td>
                  <td>{row.pendingRequests > 0 ? <span className="badge badge-yellow">{row.pendingRequests}</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Room Status Summary */}
        <div className="card mgr-ov-roomstatus">
          <div className="card-header">
            <div>
              <h3 className="card-title">Room Status Summary</h3>
              <p className="card-sub">{scoped.rooms.length} rooms {hotelId === 'all' ? 'across all hotels' : 'in this hotel'}</p>
            </div>
          </div>
          <div className="mgr-ov-roomstatus-bar">
            {scoped.rooms.length > 0 && roomStatusCounts.map(s => (
              s.count > 0 && (
                <div
                  key={s.key}
                  className="mgr-ov-roomstatus-seg"
                  style={{ width: `${(s.count / scoped.rooms.length) * 100}%`, background: s.color }}
                  title={`${s.label}: ${s.count}`}
                />
              )
            ))}
          </div>
          <div className="mgr-ov-roomstatus-legend">
            {roomStatusCounts.map(s => (
              <span key={s.key} className="mgr-ov-legend-item">
                <span className="mgr-ov-legend-dot" style={{ background: s.color }} />
                {s.label} ({s.count})
              </span>
            ))}
          </div>
        </div>

        {/* Recent Reservations + Pending Service Requests */}
        <div className="mgr-ov-cols">
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Recent Reservations</h3>
                <p className="card-sub">{scoped.reservations.length} total reservations</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>GUEST</th>
                  {hotelId === 'all' && <th>HOTEL</th>}
                  <th>ROOM</th>
                  <th>DATES</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentReservations.length === 0 ? (
                  <tr><td colSpan={hotelId === 'all' ? 5 : 4} className="empty-state">No reservations yet</td></tr>
                ) : recentReservations.map(r => (
                  <tr key={r.reservationId}>
                    <td>{r.guestName}</td>
                    {hotelId === 'all' && <td className="text-muted">{r.hotelName ?? '—'}</td>}
                    <td>Room {r.roomNumber}</td>
                    <td className="text-muted">{r.checkInDate} → {r.checkOutDate}</td>
                    <td><span className={`badge ${RES_BADGE[r.status] ?? 'badge-gray'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">Pending Service Requests</h3>
                <p className="card-sub">{scoped.requests.filter(r => r.status === 'Pending').length} awaiting action</p>
              </div>
              <button className="btn-ghost btn-sm" onClick={() => navigate('/service-requests')}>View All</button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>REQUEST</th>
                  {hotelId === 'all' && <th>HOTEL</th>}
                  <th>DEPARTMENT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {pendingRequests.length === 0 ? (
                  <tr><td colSpan={hotelId === 'all' ? 4 : 3} className="empty-state">No pending requests</td></tr>
                ) : pendingRequests.map(r => (
                  <tr key={r.requestId}>
                    <td>
                      <div className="fw-600">{r.title}</div>
                      {r.roomNumber && <div className="text-muted text-sm">Room {r.roomNumber}</div>}
                    </td>
                    {hotelId === 'all' && <td className="text-muted">{r.hotelName ?? '—'}</td>}
                    <td>{r.department}</td>
                    <td><span className={`badge ${SR_BADGE[r.status] ?? 'badge-gray'}`}>{r.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
