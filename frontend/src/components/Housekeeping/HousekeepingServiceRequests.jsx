import { useState, useEffect, useMemo } from 'react';
import TopBar from '../TopBar';
import { serviceRequestService } from '../../services/serviceRequestService';
import { hotelService } from '../../services/hotelService';
import { authService } from '../../services/authService';
import './HousekeepingServiceRequests.css';

/* ── Helpers ───────────────────────────────────────────────────── */
const DEPT_ICON = {
  Housekeeping: '🧹',
  RoomService:  '☕',
  Maintenance:  '🔧',
  Other:        '📋',
};

const PRIORITY_MAP = {
  Maintenance:  { label: 'MAINTENANCE', cls: 'hksr-tag--maintenance' },
  RoomService:  { label: 'ROUTINE',     cls: 'hksr-tag--routine'     },
  Housekeeping: { label: 'HIGH PRIORITY', cls: 'hksr-tag--high'      },
  Other:        { label: 'TASK',        cls: 'hksr-tag--task'        },
};

function timeAgoLabel(str) {
  if (!str) return '';
  return str;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Request Card ───────────────────────────────────────────────── */
function RequestCard({ req, onAccept, onComplete, onArchive, busy }) {
  const priority = PRIORITY_MAP[req.department] || PRIORITY_MAP.Other;
  const icon     = DEPT_ICON[req.department]    || '📋';
  const isPending    = req.status === 'Pending';
  const isActive     = req.status === 'Assigned' || req.status === 'InProgress';
  const isCompleted  = req.status === 'Completed';
  const isArchived   = req.status === 'Archived';

  let cardMod = '';
  if (priority.cls === 'hksr-tag--high')        cardMod = 'hksr-card--high';
  if (priority.cls === 'hksr-tag--maintenance')  cardMod = 'hksr-card--maintenance';

  return (
    <div className={`hksr-card ${cardMod}`}>
      {/* left icon */}
      <div className="hksr-card-icon">{icon}</div>

      {/* main info */}
      <div className="hksr-card-info">
        <div className="hksr-card-top">
          <span className="hksr-card-title">{req.title}</span>
          <span className={`hksr-tag ${priority.cls}`}>{priority.label}</span>
        </div>
        <div className="hksr-card-meta">
          {req.roomNumber && <span>Room {req.roomNumber}</span>}
          {req.roomNumber && <span className="hksr-dot-sep">·</span>}
          <span>Submitted {timeAgoLabel(req.timeAgo)}</span>
        </div>
        {req.description && (
          <div className="hksr-card-desc">{req.description}</div>
        )}
      </div>

      {/* right actions */}
      <div className="hksr-card-actions">
        {/* Assigned-to avatar for active requests */}
        {isActive && req.assignedToName && (
          <div className="hksr-assigned-wrap">
            <div className="hksr-avatar">{initials(req.assignedToName)}</div>
            <div className="hksr-assigned-label">
              <span className="hksr-assigned-hint">Assigned to</span>
              <span className="hksr-assigned-name">{req.assignedToName.split(' ')[0]} {req.assignedToName.split(' ')[1]?.[0]}.</span>
            </div>
          </div>
        )}

        {isPending && (
          <button
            className="hksr-btn hksr-btn--accept"
            disabled={busy}
            onClick={() => onAccept(req)}
          >
            {busy ? 'Accepting…' : 'Accept Request'}
          </button>
        )}

        {isActive && (
          <button
            className="hksr-btn hksr-btn--complete"
            disabled={busy}
            onClick={() => onComplete(req)}
          >
            Mark as Completed
          </button>
        )}

        {isCompleted && (
          <button
            className="hksr-btn hksr-btn--archive"
            disabled={busy}
            onClick={() => onArchive(req)}
          >
            Archive
          </button>
        )}

        {isArchived && (
          <span className="hksr-archived-lbl">Archived</span>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */
export default function HousekeepingServiceRequests() {
  const [requests, setRequests] = useState([]);
  const [hotels,   setHotels]   = useState([]);
  const [hotelId,  setHotelId]  = useState('');
  const [view,     setView]     = useState('active'); // 'active' | 'history'
  const [busyId,   setBusyId]   = useState(null);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setRequests([]); return; }
    serviceRequestService.getAll({ hotelId }).then(setRequests).catch(() => {});
  }, [hotelId]);

  /* ── derived lists ── */
  const active = useMemo(() =>
    requests.filter(r => r.status === 'Pending' || r.status === 'Assigned' || r.status === 'InProgress')
      .sort((a, b) => {
        // HIGH PRIORITY (Housekeeping Pending) first
        const pa = a.department === 'Housekeeping' && a.status === 'Pending' ? 0 : 1;
        const pb = b.department === 'Housekeeping' && b.status === 'Pending' ? 0 : 1;
        return pa - pb;
      }),
    [requests]
  );

  const history = useMemo(() =>
    requests.filter(r => r.status === 'Completed' || r.status === 'Archived'),
    [requests]
  );

  const displayed = view === 'active' ? active : history;

  /* ── fulfillment stats ── */
  const stats = useMemo(() => {
    const total     = requests.length;
    const completed = requests.filter(r => r.status === 'Completed' || r.status === 'Archived').length;
    const goalPct   = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { goalPct, total, completed };
  }, [requests]);

  /* ── handlers ── */
  // Accept = the currently logged-in housekeeping staff takes the task themselves
  // (self-assign), not delegating it to someone else.
  const handleAccept = async (req) => {
    const myUserId = authService.getCurrentUserId();
    if (!myUserId) { alert('Unable to identify current user. Please log in again.'); return; }
    setBusyId(req.requestId);
    try {
      const updated = await serviceRequestService.assign(req.requestId, myUserId);
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const handleComplete = async (req) => {
    setBusyId(req.requestId);
    try {
      const updated = await serviceRequestService.updateStatus(req.requestId, 'Completed');
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  const handleArchive = async (req) => {
    setBusyId(req.requestId);
    try {
      const updated = await serviceRequestService.updateStatus(req.requestId, 'Archived');
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
    } catch (err) { alert(err.message); }
    finally { setBusyId(null); }
  };

  return (
    <>
      <TopBar title="Service Requests" subtitle="Real-time guest requests and fulfilment tracking." />

      <div className="page-content hksr-page">

        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select
            className="hksr-hotel-select"
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
          >
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Main panel */}
        <div className="hksr-panel">

          {/* Panel header */}
          <div className="hksr-panel-header">
            <div className="hksr-panel-title-row">
              <span className="hksr-panel-title">Service Requests</span>
              <span className="hksr-panel-sub">Real-time guest requests and fulfilment tracking.</span>
            </div>
            <div className="hksr-view-btns">
              <button
                className={`hksr-view-btn${view === 'active' ? ' active' : ''}`}
                onClick={() => setView('active')}
              >
                Active ({active.length})
              </button>
              <button
                className={`hksr-view-btn${view === 'history' ? ' active' : ''}`}
                onClick={() => setView('history')}
              >
                History
              </button>
            </div>
          </div>

          {/* Request list */}
          <div className="hksr-list">
            {!hotelId && (
              <div className="hksr-empty">Select a hotel to view service requests.</div>
            )}
            {hotelId && displayed.length === 0 && (
              <div className="hksr-empty">
                {view === 'active' ? 'No active requests right now.' : 'No completed requests yet.'}
              </div>
            )}
            {displayed.map(req => (
              <RequestCard
                key={req.requestId}
                req={req}
                onAccept={handleAccept}
                onComplete={handleComplete}
                onArchive={handleArchive}
                busy={busyId === req.requestId}
              />
            ))}
          </div>

          {/* Fulfillment Trends */}
          <div className="hksr-trends">
            <div className="hksr-trends-header">
              <span className="hksr-trends-title">Request Fulfillment Trends</span>
              <span className="hksr-trends-avg">
                Avg. Response Time: <strong className="hksr-highlight">—</strong>
              </span>
            </div>
            <div className="hksr-trends-grid">
              <div className="hksr-trend-card">
                <div className="hksr-trend-label">RESPONSE GOAL</div>
                <div className="hksr-trend-value">
                  {stats.goalPct}%{' '}
                  <span className={`hksr-trend-badge ${stats.goalPct >= 80 ? 'hksr-met' : 'hksr-missed'}`}>
                    {stats.goalPct >= 80 ? 'Met' : 'Missed'}
                  </span>
                </div>
              </div>
              <div className="hksr-trend-card">
                <div className="hksr-trend-label">PEAK VOLUME</div>
                <div className="hksr-trend-value">
                  {active.length > 0 ? `${active.length} active` : '—'}{' '}
                  <span className="hksr-trend-note">now</span>
                </div>
              </div>
              <div className="hksr-trend-card">
                <div className="hksr-trend-label">COMPLETED TODAY</div>
                <div className="hksr-trend-value">
                  {stats.completed}
                  <span className="hksr-trend-note"> / {stats.total} total</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
