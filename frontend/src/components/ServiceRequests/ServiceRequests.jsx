import { useState, useEffect, useMemo } from 'react';
import TopBar from '../TopBar';
import { serviceRequestService } from '../../services/serviceRequestService';
import { hotelService } from '../../services/hotelService';
import { roomService } from '../../services/roomService';
import { staffService } from '../../services/staffService';
import './ServiceRequests.css';

/* ── Assign Staff Modal ─────────────────────────────────────── */
function AssignModal({ request, hotelId, onClose, onAssigned }) {
  const [staff,   setStaff]   = useState([]);
  const [selUser, setSelUser] = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    staffService.getAll({ hotelId })
      .then(s => setStaff(s.filter(m => m.isActive)))
      .catch(() => {});
  }, [hotelId]);

  const confirm = async () => {
    if (!selUser) return;
    setSaving(true);
    try {
      const updated = await serviceRequestService.assign(request.requestId, Number(selUser));
      onAssigned(updated);
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="sr-modal-overlay" onClick={onClose}>
      <div className="sr-modal" onClick={e => e.stopPropagation()}>
        <h3>Assign Staff</h3>
        <div style={{ fontSize: '.85rem', color: '#6b7280', marginTop: '-.25rem' }}>
          <strong style={{ color: '#111827' }}>{request.title}</strong>
          {request.roomNumber && <span> · Room {request.roomNumber}</span>}
        </div>
        <div className="sr-field" style={{ marginTop: '.5rem' }}>
          <label>Select Staff Member</label>
          <select value={selUser} onChange={e => setSelUser(e.target.value)}>
            <option value="">— Choose staff —</option>
            {staff.map(s => (
              <option key={s.userId} value={s.userId}>
                {s.firstName} {s.lastName} · {s.roleName}
              </option>
            ))}
          </select>
        </div>
        {staff.length === 0 && (
          <div style={{ fontSize: '.8rem', color: '#f59e0b', background: '#fef9c3', padding: '.5rem .75rem', borderRadius: '7px' }}>
            ⚠ No active staff found for this hotel.
          </div>
        )}
        <div className="sr-modal-actions">
          <button type="button" className="sr-btn-cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="sr-btn-submit"
            disabled={!selUser || saving}
            onClick={confirm}
          >
            {saving ? 'Assigning…' : 'Confirm Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}

const DEPT_TABS = ['All Requests', 'Housekeeping', 'Room Service', 'Maintenance'];

const DEPT_ICON = {
  Housekeeping: '🧹',
  RoomService:  '🍽️',
  Maintenance:  '🔧',
  Other:        '📋',
};

function badgeClass(status) {
  switch (status) {
    case 'Pending':    return 'sr-badge sr-badge--pending';
    case 'Assigned':   return 'sr-badge sr-badge--assigned';
    case 'InProgress': return 'sr-badge sr-badge--inprogress';
    case 'Completed':  return 'sr-badge sr-badge--completed';
    case 'Archived':   return 'sr-badge sr-badge--archived';
    default:           return 'sr-badge sr-badge--pending';
  }
}

// Department doubles as request priority (Housekeeping issues are treated as
// highest priority, followed by Maintenance, then routine Room Service/Other).
const PRIORITY_MAP = {
  Housekeeping: { label: 'HIGH PRIORITY', cls: 'sr-priority--high' },
  Maintenance:  { label: 'MAINTENANCE',   cls: 'sr-priority--maint' },
  RoomService:  { label: 'ROUTINE',       cls: 'sr-priority--routine' },
  Other:        { label: 'TASK',          cls: 'sr-priority--task' },
};

// Status quick-filters: Pending / In Progress / Completed / History (Archived)
const STATUS_TABS = [
  { key: 'All',        label: 'All Statuses' },
  { key: 'Pending',    label: 'Pending' },
  { key: 'Active',     label: 'In Progress' },   // Assigned + InProgress
  { key: 'Completed',  label: 'Completed' },
  { key: 'Archived',   label: 'History' },
];

/* ── New Request Modal ──────────────────────────────────────── */
function NewRequestModal({ hotelId, rooms, excludeDepartments = [], onClose, onCreated }) {
  const deptOptions = [
    { value: 'Housekeeping', label: 'Housekeeping' },
    { value: 'RoomService',  label: 'Room Service' },
    { value: 'Maintenance',  label: 'Maintenance' },
    { value: 'Other',        label: 'Other' },
  ].filter(o => !excludeDepartments.includes(o.value));

  const [form, setForm] = useState({
    roomId: '', department: deptOptions[0]?.value ?? 'Other', title: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await serviceRequestService.create({
        hotelId,
        roomId:      form.roomId ? Number(form.roomId) : null,
        guestId:     null,
        department:  form.department,
        title:       form.title.trim(),
        description: form.description.trim() || null,
      });
      onCreated(created);
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="sr-modal-overlay" onClick={onClose}>
      <div className="sr-modal" onClick={e => e.stopPropagation()}>
        <h3>New Service Request</h3>
        <form onSubmit={submit}>
          <div className="sr-modal-grid">
            <div className="sr-field">
              <label>Department</label>
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                {deptOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="sr-field">
              <label>Room (optional)</label>
              <select value={form.roomId} onChange={e => set('roomId', e.target.value)}>
                <option value="">— None —</option>
                {rooms.map(r => (
                  <option key={r.roomId} value={r.roomId}>Room {r.roomNumber}</option>
                ))}
              </select>
            </div>
            <div className="sr-field sr-modal-full">
              <label>Title *</label>
              <input
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="e.g. Extra towels needed"
              />
            </div>
            <div className="sr-field sr-modal-full">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Additional details…"
              />
            </div>
          </div>
          <div className="sr-modal-actions">
            <button type="button" className="sr-btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="sr-btn-submit" disabled={saving}>
              {saving ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
// `excludeDepartments`: departments to hide entirely from this view. Used by
// the Manager's combined Housekeeping page to keep Housekeeping-department
// requests exclusively in the "Cleaning Tasks" board instead of showing the
// same records twice across both sub-tabs.
export default function ServiceRequests({ hideTopBar = false, excludeDepartments = [] }) {
  const [requests,   setRequests]   = useState([]);
  const [hotels,     setHotels]     = useState([]);
  const [hotelId,    setHotelId]    = useState('');
  const [rooms,      setRooms]      = useState([]);
  const [activeTab,  setActiveTab]  = useState('All Requests');
  const [statusTab,  setStatusTab]  = useState('All');
  const [showModal,  setShowModal]  = useState(false);
  const [assignTarget, setAssignTarget] = useState(null); // request to assign
  const [busyId,     setBusyId]     = useState(null);

  const deptTabs = useMemo(() =>
    DEPT_TABS.filter(t => t === 'All Requests' || !excludeDepartments.includes(t.replace(' ', ''))),
    [excludeDepartments]);

  // Load hotels
  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
      else if (h.length > 1) setHotelId('all');
    }).catch(() => {});
  }, []);

  // Load requests + rooms when hotel changes
  useEffect(() => {
    if (!hotelId) { setRequests([]); setRooms([]); return; }
    load();
    if (hotelId === 'all') { setRooms([]); }
    else { roomService.getRooms(Number(hotelId)).then(setRooms).catch(() => {}); }
  }, [hotelId]);

  const load = () => {
    if (!hotelId) return;
    serviceRequestService.getAll(hotelId === 'all' ? {} : { hotelId })
      .then(setRequests)
      .catch(() => {});
  };

  // Requests visible in this view (after excluding hidden departments)
  const visibleRequests = useMemo(() =>
    excludeDepartments.length
      ? requests.filter(r => !excludeDepartments.includes(r.department))
      : requests,
    [requests, excludeDepartments]);

  // Filter by department tab + status tab
  const filtered = useMemo(() => {
    let list = visibleRequests;
    if (activeTab !== 'All Requests') {
      const deptKey = activeTab.replace(' ', ''); // "Room Service" → "RoomService"
      list = list.filter(r => r.department === deptKey);
    }
    if (statusTab === 'Pending')   list = list.filter(r => r.status === 'Pending');
    if (statusTab === 'Active')    list = list.filter(r => r.status === 'Assigned' || r.status === 'InProgress');
    if (statusTab === 'Completed') list = list.filter(r => r.status === 'Completed');
    if (statusTab === 'Archived')  list = list.filter(r => r.status === 'Archived');
    return list;
  }, [visibleRequests, activeTab, statusTab]);

  // Tab counts
  const tabCount = (tab) => {
    if (tab === 'All Requests') return visibleRequests.length;
    const key = tab.replace(' ', '');
    return visibleRequests.filter(r => r.department === key).length;
  };

  const statusTabCount = (key) => {
    if (key === 'All')       return visibleRequests.length;
    if (key === 'Pending')   return visibleRequests.filter(r => r.status === 'Pending').length;
    if (key === 'Active')    return visibleRequests.filter(r => r.status === 'Assigned' || r.status === 'InProgress').length;
    if (key === 'Completed') return visibleRequests.filter(r => r.status === 'Completed').length;
    if (key === 'Archived')  return visibleRequests.filter(r => r.status === 'Archived').length;
    return 0;
  };

  // Open assign modal
  const handleAssign = (req) => setAssignTarget(req);

  const onAssigned = (updated) =>
    setRequests(prev => prev.map(r => r.requestId === updated.requestId ? updated : r));

  const handleArchive = async (req) => {
    setBusyId(req.requestId);
    try {
      const updated = await serviceRequestService.updateStatus(req.requestId, 'Archived');
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

  const onCreated = (req) => setRequests(prev => [req, ...prev]);

  return (
    <>
      {!hideTopBar && (
        <TopBar
          title="Service Request Monitor"
          actionLabel="+ New Request"
          onAction={() => setShowModal(true)}
        />
      )}

      <div className="page-content sr-page">
        {hideTopBar && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn-primary" disabled={hotelId === 'all'} title={hotelId === 'all' ? 'Select a specific hotel to create a request' : ''} onClick={() => setShowModal(true)}>+ New Request</button>
          </div>
        )}
        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select
            className="rs-hotel-select"
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
          >
            <option value="all">All Hotels</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Filter bar */}
        <div className="sr-bar">
          <div className="sr-filter-tabs">
            {deptTabs.map(tab => (
              <button
                key={tab}
                className={`sr-tab${activeTab === tab ? ' active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
                {tabCount(tab) > 0 && (
                  <span style={{ marginLeft: '.4rem', fontSize: '.7rem', opacity: .65 }}>
                    {tabCount(tab)}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="sr-sort">Sort by: <strong>Newest First</strong></div>
        </div>

        {/* Status quick-filters: Pending / In Progress / Completed / History */}
        <div className="sr-bar" style={{ marginTop: '-.5rem' }}>
          <div className="sr-filter-tabs">
            {STATUS_TABS.map(s => (
              <button
                key={s.key}
                className={`sr-tab${statusTab === s.key ? ' active' : ''}`}
                onClick={() => setStatusTab(s.key)}
              >
                {s.label}
                {statusTabCount(s.key) > 0 && (
                  <span style={{ marginLeft: '.4rem', fontSize: '.7rem', opacity: .65 }}>
                    {statusTabCount(s.key)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="sr-card">
          {filtered.length === 0 ? (
            <div className="sr-empty">
              {hotelId ? 'No service requests found.' : 'Select a hotel to view requests.'}
            </div>
          ) : (
            <table className="sr-table">
              <thead>
                <tr>
                  <th>Guest / Room</th>
                  {hotelId === 'all' && <th>Hotel</th>}
                  <th>Request Details</th>
                  <th>Status</th>
                  <th>Department</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(req => (
                  <tr key={req.requestId}>
                    {/* Guest / Room */}
                    <td>
                      <div className="sr-guest-cell">
                        {req.roomNumber && (
                          <span className="sr-room-pill">{req.roomNumber}</span>
                        )}
                        <div className="sr-guest-info">
                          <span className="sr-guest-name">
                            {req.guestName || '—'}
                          </span>
                          {req.roomTypeName && (
                            <span className="sr-room-type">{req.roomTypeName}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {hotelId === 'all' && <td className="text-muted">{req.hotelName ?? '—'}</td>}

                    {/* Request Details */}
                    <td>
                      <div className="sr-req-title">{req.title}</div>
                      {req.description && (
                        <div className="sr-req-desc">"{req.description}"</div>
                      )}
                      <span className={`sr-priority-tag ${PRIORITY_MAP[req.department]?.cls ?? ''}`}>
                        {PRIORITY_MAP[req.department]?.label ?? 'TASK'}
                      </span>
                    </td>

                    {/* Status */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span className={badgeClass(req.status)}>
                          {req.status === 'InProgress' ? 'IN PROGRESS' : req.status.toUpperCase()}
                        </span>
                        {req.assignedToName && (
                          <span style={{ fontSize: '.7rem', color: '#6b7280', fontWeight: 600 }}>
                            👤 {req.assignedToName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Department */}
                    <td>
                      <span className="sr-dept">
                        {DEPT_ICON[req.department] || '📋'}{' '}
                        {req.department === 'RoomService' ? 'Room Service' : req.department}
                      </span>
                    </td>

                    {/* Time */}
                    <td><span className="sr-time">{req.timeAgo}</span></td>

                    {/* Actions */}
                    <td>
                      <div className="sr-action-cell">
                        {(req.status === 'Assigned' || req.status === 'InProgress') && (
                          <>
                            <button
                              className="sr-btn-link sr-btn-link--track"
                              onClick={() => handleComplete(req)}
                              disabled={busyId === req.requestId}
                            >
                              Track Order
                            </button>
                          </>
                        )}
                        {req.status === 'Pending' && (
                          <button
                            className="sr-btn-assign"
                            onClick={() => handleAssign(req)}
                            disabled={busyId === req.requestId}
                          >
                            {busyId === req.requestId ? '…' : 'Assign'}
                          </button>
                        )}
                        {req.status === 'Completed' && (
                          <button
                            className="sr-btn-link sr-btn-link--archive"
                            onClick={() => handleArchive(req)}
                            disabled={busyId === req.requestId}
                          >
                            Archived
                          </button>
                        )}
                        {req.status === 'Archived' && (
                          <span className="sr-time">Archived</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <NewRequestModal
          hotelId={Number(hotelId)}
          rooms={rooms}
          excludeDepartments={excludeDepartments}
          onClose={() => setShowModal(false)}
          onCreated={onCreated}
        />
      )}

      {assignTarget && (
        <AssignModal
          request={assignTarget}
          hotelId={assignTarget.hotelId}
          onClose={() => setAssignTarget(null)}
          onAssigned={onAssigned}
        />
      )}
    </>
  );
}
