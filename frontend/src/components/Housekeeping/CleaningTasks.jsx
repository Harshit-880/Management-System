import { useState, useEffect, useMemo, useCallback } from 'react';
import TopBar from '../TopBar';
import { useAuth } from '../../context/AuthContext';
import { serviceRequestService } from '../../services/serviceRequestService';
import { hotelService } from '../../services/hotelService';
import { roomService } from '../../services/roomService';
import { staffService } from '../../services/staffService';
import './CleaningTasks.css';

/* ── Helpers ───────────────────────────────────────────────────── */
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Assign & Start modal ──────────────────────────────────────── */
// Managers assign the task to a specific housekeeping staff member (they
// don't clean rooms themselves) — staff selection is required and the task
// lands as "Assigned" awaiting pickup. Housekeeping staff instead self-start
// a task (optional co-assignment) which immediately goes "In Progress".
function StartModal({ room, sr, hotelId, staff, isManager, onClose, onStarted }) {
  const isRoom = !!room;
  const [selUser, setSelUser] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const confirm = async () => {
    if (isManager && !selUser) { setErr('Please select a staff member to assign this task to.'); return; }
    setSaving(true); setErr('');
    try {
      let request = sr;
      if (isRoom) {
        request = await serviceRequestService.create({
          hotelId,
          roomId:      room.roomId,
          department:  'Housekeeping',
          title:       `Room Cleaning \u2014 Room ${room.roomNumber}`,
          description: `Clean and prepare Room ${room.roomNumber} (${room.roomTypeName}).`,
        });
      }
      if (selUser) {
        request = await serviceRequestService.assign(request.requestId, Number(selUser));
      }
      const targetStatus = isManager ? 'Assigned' : 'InProgress';
      const updated = await serviceRequestService.updateStatus(request.requestId, targetStatus);
      onStarted(updated);
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="ct-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={e => e.stopPropagation()}>
        <div className="ct-modal-title">
          {isManager
            ? (isRoom ? `Assign Cleaning Task — Room ${room.roomNumber}` : `Assign Task — ${sr.title}`)
            : (isRoom ? `Start Cleaning — Room ${room.roomNumber}` : `Start Task — ${sr.title}`)}
        </div>
        <div className="ct-modal-sub">
          {isRoom
            ? `${room.roomTypeName} \u00b7 ${room.floor ?? ''}`
            : sr.roomNumber ? `Room ${sr.roomNumber}` : 'General task'}
        </div>
        {err && <div className="ct-modal-err">{err}</div>}
        <div className="ct-modal-field">
          <label>{isManager ? 'Assign to Staff Member *' : 'Assign Staff (optional)'}</label>
          <select value={selUser} onChange={e => setSelUser(e.target.value)}>
            <option value="">{isManager ? '— Choose staff —' : '— Unassigned —'}</option>
            {staff.map(s => (
              <option key={s.userId} value={s.userId}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="ct-modal-actions">
          <button className="ct-modal-cancel" onClick={onClose}>Cancel</button>
          <button className="ct-modal-confirm" disabled={saving} onClick={confirm}>
            {saving
              ? (isManager ? 'Assigning\u2026' : 'Starting\u2026')
              : (isManager ? 'Assign Task' : 'Start Task')}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── TO DO Card ────────────────────────────────────────────────── */
function TodoCard({ item, isManager, onStart }) {
  const isUrgent = item.type === 'room' ||
    (item.type === 'sr' && item.data.department === 'Housekeeping');

  return (
    <div className="ct-card ct-card--todo">
      <div className="ct-card-header">
        <span className="ct-room-num">
          {item.type === 'room'
            ? `Room ${item.data.roomNumber}`
            : item.data.roomNumber ? `Room ${item.data.roomNumber}` : 'General Task'}
        </span>
        <span className={`ct-badge ${isUrgent ? 'ct-badge--urgent' : 'ct-badge--std'}`}>
          {isUrgent ? 'URGENT' : 'STANDARD'}
        </span>
      </div>
      <div className="ct-card-desc">
        {item.type === 'room'
          ? 'Dirty room requires cleaning and preparation.'
          : item.data.title}
      </div>
      <div className="ct-card-footer">
        <span className="ct-meta-txt">
          {item.type === 'room'
            ? `${item.data.floor ?? ''} \u00b7 ${item.data.roomTypeName}`
            : item.data.timeAgo ? `Submitted ${item.data.timeAgo}` : ''}
        </span>
        <button className="ct-start-btn" onClick={() => onStart(item)}>
          {isManager ? 'Assign Task' : 'Start Task'}
        </button>
      </div>
    </div>
  );
}

/* ── IN PROGRESS Card ──────────────────────────────────────────── */
function InProgressCard({ sr, onMarkDone }) {
  return (
    <div className="ct-card ct-card--progress">
      <div className="ct-card-header">
        <span className="ct-room-num">
          {sr.roomNumber ? `Room ${sr.roomNumber}` : sr.title}
        </span>
        <span className="ct-badge ct-badge--progress">
          {sr.status === 'InProgress' ? 'CLEANING' : 'ASSIGNED'}
        </span>
      </div>
      <div className="ct-card-footer">
        {sr.assignedToName ? (
          <div className="ct-assigned-row">
            <div className="ct-avatar">{initials(sr.assignedToName)}</div>
            <span className="ct-assigned-name">{sr.assignedToName}</span>
          </div>
        ) : (
          <span className="ct-meta-txt">Unassigned</span>
        )}
        <button className="ct-done-btn" onClick={() => onMarkDone(sr)}>
          Mark Done
        </button>
      </div>
    </div>
  );
}

/* ── VERIFICATION Card ─────────────────────────────────────────── */
function VerificationCard({ sr, onApprove, onReject, busy }) {
  return (
    <div className="ct-card ct-card--verify">
      <div className="ct-card-header">
        <span className="ct-room-num">
          {sr.roomNumber ? `Room ${sr.roomNumber}` : sr.title}
        </span>
        <span className="ct-badge ct-badge--done">DONE</span>
      </div>
      <div className="ct-card-desc ct-verify-msg">
        Cleaning reported as finished. Requires supervisor sign-off.
      </div>
      {sr.assignedToName && (
        <div className="ct-assigned-row">
          <div className="ct-avatar">{initials(sr.assignedToName)}</div>
          <span className="ct-assigned-name">{sr.assignedToName}</span>
        </div>
      )}
      <div className="ct-verify-actions">
        <button className="ct-approve-btn" disabled={busy} onClick={() => onApprove(sr)}>
          Approve
        </button>
        <button className="ct-reject-btn" disabled={busy} onClick={() => onReject(sr)}>
          Reject
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */
export default function CleaningTasks({ hideTopBar = false }) {
  const { user } = useAuth();
  const isManager = user?.roles?.[0] === 'Manager';

  const [hotels,      setHotels]      = useState([]);
  const [hotelId,     setHotelId]     = useState('');
  const [rooms,       setRooms]       = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [startTarget, setStartTarget] = useState(null);
  const [busyId,      setBusyId]      = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  const reload = useCallback(() => {
    if (!hotelId) return;
    setLoading(true);
    Promise.all([
      roomService.getRooms(Number(hotelId)),
      serviceRequestService.getAll({ hotelId }),
      staffService.getAll({ hotelId }),
    ]).then(async ([r, sr, st]) => {
      // Self-heal: a "Completed" housekeeping request only belongs in the
      // Verification column while its room is still marked Dirty (i.e. not
      // yet approved). If the room was already cleared through another flow
      // (e.g. Approved earlier, or reset from the Room Status page), any
      // leftover Completed request for that room is stale — archive it so it
      // doesn't show up as a duplicate verification card.
      const roomStatus = new Map(r.map(rm => [rm.roomId, rm.status]));
      const stale = sr.filter(req =>
        req.department === 'Housekeeping' &&
        req.status === 'Completed' &&
        req.roomId &&
        roomStatus.get(req.roomId) !== 'Dirty'
      );

      let finalRequests = sr;
      if (stale.length > 0) {
        await Promise.all(
          stale.map(req => serviceRequestService.updateStatus(req.requestId, 'Archived').catch(() => {}))
        );
        const staleIds = new Set(stale.map(req => req.requestId));
        finalRequests = sr.map(req => staleIds.has(req.requestId) ? { ...req, status: 'Archived' } : req);
      }

      setRooms(r);
      setRequests(finalRequests);
      setStaff(st.filter(s => s.isActive));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotelId]);

  useEffect(() => { reload(); }, [reload]);

  /* ── derived columns ── */
  const hkRequests = useMemo(() =>
    requests.filter(r => r.department === 'Housekeeping'), [requests]);

  const activeHkRoomIds = useMemo(() => new Set(
    hkRequests
      .filter(r => r.status !== 'Archived' && r.roomId)
      .map(r => r.roomId)
  ), [hkRequests]);

  const todoItems = useMemo(() => [
    ...rooms
      .filter(r => r.status === 'Dirty' && !activeHkRoomIds.has(r.roomId))
      .map(r => ({ type: 'room', data: r, id: `room-${r.roomId}` })),
    ...hkRequests
      .filter(r => r.status === 'Pending')
      .map(r => ({ type: 'sr', data: r, id: `sr-${r.requestId}` })),
  ], [rooms, hkRequests, activeHkRoomIds]);

  const inProgressItems = useMemo(() =>
    hkRequests.filter(r => r.status === 'Assigned' || r.status === 'InProgress'),
    [hkRequests]);

  const verifyItems = useMemo(() =>
    hkRequests.filter(r => r.status === 'Completed'), [hkRequests]);

  const historyItems = useMemo(() =>
    hkRequests
      .filter(r => r.status === 'Archived')
      .sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt)),
    [hkRequests]);

  /* ── action handlers ── */
  const onStarted = (updated) => {
    setRequests(prev => {
      const exists = prev.find(r => r.requestId === updated.requestId);
      return exists
        ? prev.map(r => r.requestId === updated.requestId ? updated : r)
        : [updated, ...prev];
    });
  };

  const handleMarkDone = async (sr) => {
    setBusyId(sr.requestId);
    try {
      const updated = await serviceRequestService.updateStatus(sr.requestId, 'Completed');
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const handleApprove = async (sr) => {
    setBusyId(sr.requestId);
    try {
      await serviceRequestService.updateStatus(sr.requestId, 'Archived');
      if (sr.roomId) {
        await roomService.updateRoom(sr.roomId, { status: 'Available' });
        setRooms(prev => prev.map(r => r.roomId === sr.roomId ? { ...r, status: 'Available' } : r));
      }

      // The room is now confirmed clean — any OTHER Completed housekeeping
      // request still pointing at this same room is a stale duplicate
      // (e.g. leftover from an earlier cycle that was never approved).
      // Archive those too so they don't linger in Verification.
      const siblingStale = sr.roomId
        ? requests.filter(r =>
            r.roomId === sr.roomId &&
            r.requestId !== sr.requestId &&
            r.department === 'Housekeeping' &&
            r.status === 'Completed'
          )
        : [];
      if (siblingStale.length > 0) {
        await Promise.all(
          siblingStale.map(r => serviceRequestService.updateStatus(r.requestId, 'Archived').catch(() => {}))
        );
      }
      const clearedIds = new Set([sr.requestId, ...siblingStale.map(r => r.requestId)]);

      setRequests(prev => prev.map(r =>
        clearedIds.has(r.requestId) ? { ...r, status: 'Archived' } : r));
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const handleReject = async (sr) => {
    setBusyId(sr.requestId);
    try {
      const updated = await serviceRequestService.updateStatus(sr.requestId, 'InProgress');
      setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));
    } catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  return (
    <>
      {!hideTopBar && (
        <TopBar title="Cleaning Tasks" subtitle="Assign and monitor real-time cleaning operations." />
      )}
      <div className="page-content ct-page">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.75rem' }}>
          {hotels.length > 1 ? (
            <select className="ct-hotel-select" value={hotelId}
              onChange={e => setHotelId(e.target.value)}>
              <option value="">— Select hotel —</option>
              {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          ) : <span />}
          <button className="btn-ghost btn-sm" onClick={() => setShowHistory(v => !v)}>
            {showHistory ? '← Back to Board' : `View History (${historyItems.length})`}
          </button>
        </div>

        {!hotelId && <div className="ct-empty">Select a hotel to view cleaning tasks.</div>}
        {hotelId && loading && <div className="ct-empty">Loading…</div>}

        {hotelId && !loading && showHistory && (
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Housekeeping History</h3>
                <p className="card-sub">Completed &amp; approved cleaning tasks</p>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>ROOM</th>
                  <th>TITLE</th>
                  <th>COMPLETED BY</th>
                  <th>DATE</th>
                </tr>
              </thead>
              <tbody>
                {historyItems.length === 0 ? (
                  <tr><td colSpan={4} className="empty-state">No completed cleaning history yet.</td></tr>
                ) : historyItems.map(r => (
                  <tr key={r.requestId}>
                    <td>{r.roomNumber ? `Room ${r.roomNumber}` : '—'}</td>
                    <td>{r.title}</td>
                    <td>{r.assignedToName || '—'}</td>
                    <td className="text-muted">{new Date(r.updatedAt ?? r.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hotelId && !loading && !showHistory && (
          <div className="ct-board">

            {/* TO DO */}
            <div className="ct-col">
              <div className="ct-col-head ct-col-head--todo">
                <span>TO DO ({todoItems.length})</span>
                <span className="ct-col-dots">•••</span>
              </div>
              <div className="ct-col-body">
                {todoItems.length === 0
                  ? <div className="ct-col-empty">All caught up ✓</div>
                  : todoItems.map(item => (
                    <TodoCard key={item.id} item={item} isManager={isManager} onStart={i => setStartTarget(i)} />
                  ))}
              </div>
            </div>

            {/* IN PROGRESS */}
            <div className="ct-col">
              <div className="ct-col-head ct-col-head--progress">
                <span>IN PROGRESS ({inProgressItems.length})</span>
                <span className="ct-col-dots">•••</span>
              </div>
              <div className="ct-col-body">
                {inProgressItems.length === 0
                  ? <div className="ct-col-empty">Nothing in progress</div>
                  : inProgressItems.map(sr => (
                    <InProgressCard key={sr.requestId} sr={sr} onMarkDone={handleMarkDone} />
                  ))}
              </div>
            </div>

            {/* VERIFICATION */}
            <div className="ct-col">
              <div className="ct-col-head ct-col-head--verify">
                <span>VERIFICATION ({verifyItems.length})</span>
                <span className="ct-col-dots">•••</span>
              </div>
              <div className="ct-col-body">
                {verifyItems.length === 0
                  ? <div className="ct-col-empty">No tasks pending review</div>
                  : verifyItems.map(sr => (
                    <VerificationCard
                      key={sr.requestId}
                      sr={sr}
                      onApprove={handleApprove}
                      onReject={handleReject}
                      busy={busyId === sr.requestId}
                    />
                  ))}
              </div>
            </div>

          </div>
        )}
      </div>

      {startTarget && (
        <StartModal
          room={startTarget.type === 'room' ? startTarget.data : null}
          sr={startTarget.type === 'sr'   ? startTarget.data : null}
          hotelId={Number(hotelId)}
          staff={staff}
          isManager={isManager}
          onClose={() => setStartTarget(null)}
          onStarted={onStarted}
        />
      )}
    </>
  );
}
