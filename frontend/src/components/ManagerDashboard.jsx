import { useState, useEffect, useMemo } from 'react';
import {
  LogIn, LogOut, BedDouble, DoorOpen, BellRing, DollarSign, TrendingUp,
} from 'lucide-react';
import TopBar from './TopBar';
import StatsCard from './StatsCard';
import { hotelService } from '../services/hotelService';
import { roomService } from '../services/roomService';
import { reservationService } from '../services/reservationService';
import { serviceRequestService } from '../services/serviceRequestService';

const TODAY = new Date().toISOString().slice(0, 10);

const ROOM_STATUS_META = [
  { key: 'Available',    label: 'Available',    color: '#22c55e' },
  { key: 'Occupied',     label: 'Occupied',     color: '#3b82f6' },
  { key: 'Dirty',        label: 'Dirty',        color: '#f97316' },
  { key: 'Maintenance',  label: 'Maintenance',  color: '#ef4444' },
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

export default function ManagerDashboard() {
  /* ── Overview state ── */
  const [hotels,       setHotels]       = useState([]);
  const [hotelId,      setHotelId]      = useState('');
  const [rooms,        setRooms]        = useState([]);
  const [reservations, setReservations] = useState([]);
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setRooms([]); setReservations([]); setRequests([]); return; }
    setLoading(true);
    Promise.all([
      roomService.getRooms(Number(hotelId)),
      reservationService.getAll({ hotelId }),
      serviceRequestService.getAll({ hotelId }),
    ]).then(([r, res, sr]) => {
      setRooms(r);
      setReservations(res);
      setRequests(sr);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotelId]);

  /* ── Derived stats ── */
  const stats = useMemo(() => {
    const checkInsToday  = reservations.filter(r => r.checkInDate === TODAY && r.status !== 'Cancelled').length;
    const checkOutsToday = reservations.filter(r => r.checkOutDate === TODAY && r.status !== 'Cancelled').length;
    const occupied  = rooms.filter(r => r.status === 'Occupied').length;
    const available = rooms.filter(r => r.status === 'Available').length;
    const pendingRequests = requests.filter(r => r.status === 'Pending').length;
    const revenueToday = reservations
      .filter(r => r.checkOutDate === TODAY && r.status === 'CheckedOut')
      .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
    const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0;

    const roomStatusCounts = ROOM_STATUS_META.map(meta => ({
      ...meta,
      count: rooms.filter(r => r.status === meta.key).length,
    }));

    const recentReservations = [...reservations]
      .sort((a, b) => b.reservationId - a.reservationId)
      .slice(0, 5);

    const recentRequests = [...requests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return {
      checkInsToday, checkOutsToday, occupied, available,
      pendingRequests, revenueToday, occupancyRate,
      roomStatusCounts, recentReservations, recentRequests,
    };
  }, [rooms, reservations, requests]);

  return (
    <>
      <TopBar title="Manager Dashboard" subtitle="Today's overview" showSearch={false} />

      <div className="page-content">
        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select
            className="mgr-hotel-select"
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
          >
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {!hotelId && (
          <div className="empty-state" style={{ marginTop: '2rem' }}>
            Select a hotel to view today's overview.
          </div>
        )}

        {hotelId && (
          <>
                {/* Quick stats */}
                <div className="stats-grid mgr-ov-stats">
                  <StatsCard icon={LogIn}      label="TODAY'S CHECK-INS"        value={loading ? '—' : stats.checkInsToday} sub="Scheduled arrivals today" />
                  <StatsCard icon={LogOut}     label="TODAY'S CHECK-OUTS"       value={loading ? '—' : stats.checkOutsToday} sub="Scheduled departures today" />
                  <StatsCard icon={BedDouble}  label="OCCUPIED ROOMS"           value={loading ? '—' : stats.occupied} sub={`${rooms.length} total rooms`} />
                  <StatsCard icon={DoorOpen}   label="AVAILABLE ROOMS"          value={loading ? '—' : stats.available} sub="Ready for check-in" />
                  <StatsCard icon={BellRing}   label="PENDING SERVICE REQUESTS" value={loading ? '—' : stats.pendingRequests} sub={`${requests.length} total requests`} />
                  <StatsCard icon={DollarSign} label="TODAY'S REVENUE"          value={loading ? '—' : fmtCurrency(stats.revenueToday)} sub="From completed check-outs" />
                  <StatsCard icon={TrendingUp} label="OCCUPANCY RATE"           value={loading ? '—' : `${stats.occupancyRate}%`} sub={`${stats.occupied} of ${rooms.length} rooms`} />
                </div>

                {/* Room Status Summary */}
                <div className="card mgr-ov-roomstatus">
                  <div className="card-header">
                    <div>
                      <h3 className="card-title">Room Status Summary</h3>
                      <p className="card-sub">{rooms.length} rooms across the property</p>
                    </div>
                  </div>
                  <div className="mgr-ov-roomstatus-bar">
                    {rooms.length > 0 && stats.roomStatusCounts.map(s => (
                      s.count > 0 && (
                        <div
                          key={s.key}
                          className="mgr-ov-roomstatus-seg"
                          style={{ width: `${(s.count / rooms.length) * 100}%`, background: s.color }}
                          title={`${s.label}: ${s.count}`}
                        />
                      )
                    ))}
                  </div>
                  <div className="mgr-ov-roomstatus-legend">
                    {stats.roomStatusCounts.map(s => (
                      <span key={s.key} className="mgr-ov-legend-item">
                        <span className="mgr-ov-legend-dot" style={{ background: s.color }} />
                        {s.label} ({s.count})
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent Reservations + Recent Service Requests */}
                <div className="mgr-ov-cols">
                  <div className="card">
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Recent Reservations</h3>
                        <p className="card-sub">{reservations.length} total reservations</p>
                      </div>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>GUEST</th>
                          <th>ROOM</th>
                          <th>DATES</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentReservations.length === 0 ? (
                          <tr><td colSpan={4} className="empty-state">No reservations yet</td></tr>
                        ) : stats.recentReservations.map(r => (
                          <tr key={r.reservationId}>
                            <td>{r.guestName}</td>
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
                        <h3 className="card-title">Recent Service Requests</h3>
                        <p className="card-sub">{requests.length} total requests</p>
                      </div>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>REQUEST</th>
                          <th>ROOM</th>
                          <th>STATUS</th>
                          <th>TIME</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentRequests.length === 0 ? (
                          <tr><td colSpan={4} className="empty-state">No service requests yet</td></tr>
                        ) : stats.recentRequests.map(sr => (
                          <tr key={sr.requestId}>
                            <td>{sr.title}</td>
                            <td>{sr.roomNumber ? `Room ${sr.roomNumber}` : '—'}</td>
                            <td><span className={`badge ${SR_BADGE[sr.status] ?? 'badge-gray'}`}>{sr.status}</span></td>
                            <td className="text-muted">{sr.timeAgo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
        )}
      </div>
    </>
  );
}
