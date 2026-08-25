import { useState, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import TopBar from './TopBar';
import NewReservationModal from './NewReservationModal';
import ChangeRoomModal from './ChangeRoomModal';
import { useAuth } from '../context/AuthContext';
import { reservationService } from '../services/reservationService';
import { roomService } from '../services/roomService';
import { hotelService } from '../services/hotelService';

const TODAY = new Date().toISOString().slice(0, 10);
const PORTAL_BASE = `${window.location.origin}/guest`;

const STATUS_BADGE = {
  Confirmed:  'badge-blue',
  Pending:    'badge-yellow',
  CheckedIn:  'badge-green',
  CheckedOut: 'badge-gray',
  Cancelled:  'badge-red',
};

const FILTERS = [
  { key: 'All',        label: 'All' },
  { key: 'Confirmed',  label: 'Confirmed' },
  { key: 'Pending',    label: 'Pending' },
  { key: 'CheckedIn',  label: 'Checked In' },
  { key: 'CheckedOut', label: 'Checked Out' },
  { key: 'Cancelled',  label: 'Cancelled' },
];

const ROOM_SUMMARY_LABELS = [
  { label: 'Available',   color: '#22c55e', key: 'Available' },
  { label: 'Occupied',    color: '#3b82f6', key: 'Occupied'  },
  { label: 'Dirty',       color: '#f97316', key: 'Dirty'     },
  { label: 'Maintenance', color: '#ef4444', key: 'Maintenance' },
];

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Guest Portal link panel ─────────────────────────────────── */
function QrPanel({ reservations }) {
  const [selId,   setSelId]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const checkedIn = reservations.filter(r => r.status === 'CheckedIn' && r.accessToken);
  const selected  = checkedIn.find(r => String(r.reservationId) === selId);
  const portalUrl = selected ? `${PORTAL_BASE}/${selected.accessToken}` : '';

  const copy = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <select
        className="rx-select"
        value={selId}
        onChange={e => { setSelId(e.target.value); setCopied(false); }}
      >
        <option value="">Select room…</option>
        {checkedIn.map(r => (
          <option key={r.reservationId} value={r.reservationId}>
            Room {r.roomNumber} — {r.guestName}
          </option>
        ))}
      </select>
      {portalUrl ? (
        <>
          <div style={{
            display: 'flex', justifyContent: 'center', background: '#fff',
            border: '1px solid #c7d2fe', borderRadius: '7px', padding: '.6rem',
            marginTop: '.35rem',
          }}>
            <QRCodeSVG value={portalUrl} size={128} />
          </div>
          <div style={{
            fontSize: '.72rem', wordBreak: 'break-all', background: '#f0f4ff',
            border: '1px solid #c7d2fe', borderRadius: '7px', padding: '.5rem .65rem',
            color: '#4338ca', marginTop: '.35rem',
          }}>
            {portalUrl}
          </div>
          <button className="rx-qr-btn" onClick={copy} style={{ marginTop: '.5rem' }}>
            {copied ? '✓ Copied!' : 'Copy Link & Share'}
          </button>
        </>
      ) : (
        <button className="rx-qr-btn" disabled style={{ marginTop: '.35rem', opacity: .4 }}>
          Select a room first
        </button>
      )}
    </>
  );
}

/* ── Modify Reservation Modal ────────────────────────────── */
function ModifyModal({ reservation: r, onClose, onSaved }) {
  const canChangeDates = r.status === 'Pending' || r.status === 'Confirmed';
  const [form, setForm] = useState({
    checkInDate:  r.checkInDate,
    checkOutDate: r.checkOutDate,
    totalAmount:  String(r.totalAmount ?? ''),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const nights = (() => {
    const d1 = new Date(form.checkInDate  + 'T00:00:00');
    const d2 = new Date(form.checkOutDate + 'T00:00:00');
    return Math.max(0, (d2 - d1) / 86400000);
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (canChangeDates && form.checkOutDate <= form.checkInDate) {
      alert('Check-out must be after check-in.'); return;
    }
    setSaving(true);
    try {
      const updated = await reservationService.modify(r.reservationId, {
        checkInDate:  form.checkInDate,
        checkOutDate: form.checkOutDate,
        totalAmount:  form.totalAmount ? Number(form.totalAmount) : null,
      });
      onSaved(updated);
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}
         onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, padding:'1.75rem', width:'100%', maxWidth:440,
                    boxShadow:'0 20px 60px rgba(0,0,0,.18)', display:'flex', flexDirection:'column', gap:'1.1rem' }}
           onClick={e => e.stopPropagation()}>
        <div>
          <h3 style={{ fontSize:'1.05rem', fontWeight:700, color:'#111827', margin:0 }}>Modify Reservation</h3>
          <div style={{ fontSize:'.82rem', color:'#6b7280', marginTop:3 }}>
            {r.guestName} · Room {r.roomNumber}
          </div>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:'.85rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              <label style={{ fontSize:'.72rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'#374151' }}>Check-In</label>
              <input type="date" required
                disabled={!canChangeDates}
                value={form.checkInDate}
                onChange={e => set('checkInDate', e.target.value)}
                style={{ padding:'.55rem .75rem', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:'.88rem',
                         background: canChangeDates ? '#fff' : '#f9fafb', cursor: canChangeDates ? 'auto' : 'not-allowed' }}
              />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
              <label style={{ fontSize:'.72rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'#374151' }}>Check-Out</label>
              <input type="date" required
                disabled={!canChangeDates}
                value={form.checkOutDate}
                onChange={e => set('checkOutDate', e.target.value)}
                style={{ padding:'.55rem .75rem', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:'.88rem',
                         background: canChangeDates ? '#fff' : '#f9fafb', cursor: canChangeDates ? 'auto' : 'not-allowed' }}
              />
            </div>
          </div>

          {canChangeDates && nights > 0 && (
            <div style={{ fontSize:'.78rem', color:'#6b7280', background:'#f0f4ff', padding:'.4rem .75rem', borderRadius:7 }}>
              🗓 {nights} night{nights !== 1 ? 's' : ''}
            </div>
          )}
          {!canChangeDates && (
            <div style={{ fontSize:'.78rem', color:'#d97706', background:'#fef9c3', padding:'.4rem .75rem', borderRadius:7 }}>
              ⚠ Dates cannot be changed after check-in.
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
            <label style={{ fontSize:'.72rem', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'#374151' }}>Total Amount (₹)</label>
            <input type="number" min="0" step="0.01"
              value={form.totalAmount}
              onChange={e => set('totalAmount', e.target.value)}
              placeholder="Leave blank to keep current"
              style={{ padding:'.55rem .75rem', border:'1.5px solid #e5e7eb', borderRadius:8, fontSize:'.88rem' }}
            />
          </div>

          <div style={{ display:'flex', justifyContent:'flex-end', gap:'.65rem', marginTop:'.25rem' }}>
            <button type="button"
              style={{ padding:'.5rem 1.2rem', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:8, fontSize:'.88rem', fontWeight:600, cursor:'pointer' }}
              onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}
              style={{ padding:'.5rem 1.4rem', background:'#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:'.88rem', fontWeight:700, cursor:'pointer', opacity: saving ? .6 : 1 }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Reservation Detail Drawer ───────────────────────────────── */
const DRAWER_STATUS = {
  Confirmed:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Pending:    { bg: '#fefce8', color: '#92400e', border: '#fde68a' },
  CheckedIn:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  CheckedOut: { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' },
  Cancelled:  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

function ReservationDrawer({ r, onClose, onCheckin, onCheckout, onModify, onCancel, onChangeRoom, busy }) {
  const sc = DRAWER_STATUS[r.status] ?? DRAWER_STATUS.CheckedOut;
  const canAct = r.status !== 'CheckedOut' && r.status !== 'Cancelled';
  const portalUrl = r.accessToken ? `${window.location.origin}/guest/${r.accessToken}` : null;

  return (
    <>
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.35)', zIndex:900 }}
           onClick={onClose} />
      <div style={{
        position:'fixed', top:0, right:0, height:'100vh', width:420,
        background:'#fff', zIndex:901, display:'flex', flexDirection:'column',
        boxShadow:'-12px 0 50px rgba(0,0,0,.15)',
      }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)', padding:'1.4rem 1.5rem', color:'#fff', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ display:'flex', gap:'.75rem', alignItems:'center' }}>
              <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,.22)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:'.95rem', flexShrink:0 }}>
                {initials(r.guestName)}
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:'1.08rem', lineHeight:1.2 }}>{r.guestName}</div>
                <div style={{ fontSize:'.78rem', opacity:.82, marginTop:'.12rem' }}>{r.guestPhone || r.guestEmail || 'No contact info'}</div>
              </div>
            </div>
            <button onClick={onClose}
              style={{ background:'rgba(255,255,255,.18)', border:'none', color:'#fff', borderRadius:8, width:32, height:32, fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              ✕
            </button>
          </div>
          <div style={{ marginTop:'.8rem', display:'flex', alignItems:'center', gap:'.6rem' }}>
            <span style={{ background:sc.bg, color:sc.color, border:`1px solid ${sc.border}`, borderRadius:20, padding:'.18rem .75rem', fontSize:'.73rem', fontWeight:700 }}>
              {r.status}
            </span>
            <span style={{ fontSize:'.73rem', opacity:.7 }}>Reservation #{r.reservationId}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.2rem 1.5rem', display:'flex', flexDirection:'column', gap:'.85rem' }}>
          {/* Room + Amount */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem' }}>
            <div style={{ background:'#f5f3ff', borderRadius:10, padding:'.85rem', border:'1px solid #e9d5ff' }}>
              <div style={{ fontSize:'.67rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', marginBottom:'.3rem' }}>Room</div>
              <div style={{ fontWeight:800, fontSize:'1.12rem', color:'#1e1b4b' }}>Room {r.roomNumber}</div>
              <div style={{ fontSize:'.78rem', color:'#6b7280', marginTop:'.1rem' }}>{r.roomTypeName}{r.floor ? ` · Floor ${r.floor}` : ''}</div>
            </div>
            <div style={{ background:'#fdf4ff', borderRadius:10, padding:'.85rem', border:'1px solid #f5d0fe' }}>
              <div style={{ fontSize:'.67rem', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', marginBottom:'.3rem' }}>Amount</div>
              <div style={{ fontWeight:800, fontSize:'1.12rem', color:'#1e1b4b' }}>₹{r.totalAmount?.toLocaleString()}</div>
              <div style={{ fontSize:'.78rem', color:'#6b7280', marginTop:'.1rem' }}>{r.nights} night{r.nights !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Stay dates */}
          <div style={{ background:'#f9fafb', borderRadius:10, padding:'.9rem 1rem', border:'1px solid #e5e7eb' }}>
            <div style={{ fontSize:'.67rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', marginBottom:'.6rem' }}>Stay Period</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 24px 1fr', alignItems:'center', gap:'.4rem' }}>
              <div style={{ background:'#eff6ff', borderRadius:8, padding:'.6rem', textAlign:'center', border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:'.65rem', color:'#3b82f6', fontWeight:700, textTransform:'uppercase' }}>Check-In</div>
                <div style={{ fontWeight:700, fontSize:'.88rem', color:'#1e40af', marginTop:'.15rem' }}>{r.checkInDate}</div>
              </div>
              <div style={{ color:'#d1d5db', textAlign:'center' }}>→</div>
              <div style={{ background:'#fff7ed', borderRadius:8, padding:'.6rem', textAlign:'center', border:'1px solid #fed7aa' }}>
                <div style={{ fontSize:'.65rem', color:'#f97316', fontWeight:700, textTransform:'uppercase' }}>Check-Out</div>
                <div style={{ fontWeight:700, fontSize:'.88rem', color:'#c2410c', marginTop:'.15rem' }}>{r.checkOutDate}</div>
              </div>
            </div>
          </div>

          {/* Portal link (checked-in only) */}
          {portalUrl && (
            <div style={{ background:'#f0fdf4', borderRadius:10, padding:'.85rem', border:'1px solid #bbf7d0' }}>
              <div style={{ fontSize:'.67rem', fontWeight:700, color:'#16a34a', textTransform:'uppercase', marginBottom:'.4rem' }}>🔗 Guest Portal</div>
              <div style={{ fontSize:'.72rem', color:'#374151', wordBreak:'break-all', fontFamily:'monospace', background:'#fff', borderRadius:6, padding:'.3rem .5rem', marginBottom:'.4rem', border:'1px solid #d1fae5' }}>
                {portalUrl}
              </div>
              <button onClick={() => navigator.clipboard.writeText(portalUrl)}
                style={{ width:'100%', padding:'.38rem', background:'#dcfce7', border:'1px solid #86efac', borderRadius:7, color:'#15803d', fontWeight:700, fontSize:'.78rem', cursor:'pointer' }}>
                📋 Copy Portal Link
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding:'1rem 1.5rem', borderTop:'1.5px solid #f3f4f6', flexShrink:0, display:'flex', flexDirection:'column', gap:'.45rem' }}>
          {(r.status === 'Pending' || r.status === 'Confirmed') && (
            r.checkInDate > TODAY ? (
              <div style={{ background:'#fefce8', border:'1px solid #fde68a', borderRadius:10, padding:'.7rem 1rem', textAlign:'center' }}>
                <div style={{ fontSize:'.78rem', fontWeight:700, color:'#92400e' }}>⏳ Check-In Not Yet Available</div>
                <div style={{ fontSize:'.8rem', color:'#78350f', marginTop:'.25rem' }}>Scheduled for {r.checkInDate}</div>
              </div>
            ) : (
              <button disabled={busy} onClick={onCheckin}
                style={{ width:'100%', padding:'.72rem', background: busy ? '#9ca3af' : '#16a34a', color:'#fff', border:'none', borderRadius:10, fontWeight:800, fontSize:'.98rem', cursor: busy ? 'not-allowed' : 'pointer' }}>
                {busy ? 'Processing…' : '✓  Check In Guest'}
              </button>
            )
          )}
          {r.status === 'CheckedIn' && (
            <button disabled={busy} onClick={onCheckout}
              style={{ width:'100%', padding:'.72rem', background: busy ? '#9ca3af' : '#dc2626', color:'#fff', border:'none', borderRadius:10, fontWeight:800, fontSize:'.98rem', cursor: busy ? 'not-allowed' : 'pointer' }}>
              {busy ? 'Processing…' : '⬤  Check Out Guest'}
            </button>
          )}
          {canAct && (
            <div style={{ display:'flex', gap:'.45rem', flexWrap:'wrap' }}>
              <button onClick={onModify}
                style={{ flex:'1 1 auto', padding:'.5rem', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:8, fontWeight:600, fontSize:'.85rem', cursor:'pointer' }}>
                ✏ Modify
              </button>
              <button onClick={onChangeRoom}
                style={{ flex:'1 1 auto', padding:'.5rem', background:'#eff6ff', color:'#1d4ed8', border:'1px solid #bfdbfe', borderRadius:8, fontWeight:600, fontSize:'.85rem', cursor:'pointer' }}>
                🔁 Change Room
              </button>
              {(r.status === 'Pending' || r.status === 'Confirmed') && (
                <button onClick={onCancel}
                  style={{ flex:'1 1 auto', padding:'.5rem', background:'#fef2f2', color:'#dc2626', border:'1px solid #fecaca', borderRadius:8, fontWeight:600, fontSize:'.85rem', cursor:'pointer' }}>
                  ✕ Cancel
                </button>
              )}
            </div>
          )}
          {!canAct && (
            <div style={{ textAlign:'center', color:'#9ca3af', fontSize:'.82rem', padding:'.2rem 0' }}>
              No further actions available
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Shared reservations management screen — used by both the Receptionist
// ("/reception") and Manager ("/manager/reservations") roles since the
// functionality (view/search/create/edit/cancel/check-in/check-out/assign
// room) is identical for both. Any part that should be hidden from
// Receptionists (and only shown to Managers) should be gated behind the
// `isManager` check below rather than duplicating this component.
export default function ReceptionistDashboard() {
  const { user } = useAuth();
  const isManager = user?.roles?.[0] === 'Manager';

  const [reservations, setReservations] = useState([]);
  const [rooms,        setRooms]        = useState([]);
  const [hotels,       setHotels]       = useState([]);
  const [hotelId,      setHotelId]      = useState('');
  const [filter,       setFilter]       = useState('All');
  const [dateFilter,   setDateFilter]   = useState('');
  const [search,       setSearch]       = useState('');
  const [showModal,    setShowModal]     = useState(false);
  const [modifyTarget,     setModifyTarget]     = useState(null);
  const [changeRoomTarget, setChangeRoomTarget] = useState(null);
  const [actionLoading,    setActionLoading]    = useState(null); // reservationId
  const [portalInfo,   setPortalInfo]    = useState(null); // { guestName, roomNumber, url }
  const [drawerRes,    setDrawerRes]     = useState(null);

  // Load hotels
  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
      else if (h.length > 1) setHotelId('all');
    }).catch(() => {});
  }, []);

  // Load reservations + rooms when hotel changes
  useEffect(() => {
    if (!hotelId) return;
    const scope = hotelId === 'all' ? {} : { hotelId };
    reservationService.getAll(scope).then(setReservations).catch(() => {});
    roomService.getRooms(hotelId === 'all' ? undefined : Number(hotelId)).then(setRooms).catch(() => {});
  }, [hotelId]);

  /* ── Stats ── */
  const arrivalsToday  = reservations.filter(r => r.checkInDate  === TODAY && (r.status === 'Confirmed' || r.status === 'Pending')).length;
  const checkedIn      = reservations.filter(r => r.status === 'CheckedIn').length;
  const checkoutsToday = reservations.filter(r => r.checkOutDate === TODAY && r.status === 'CheckedIn').length;
  const totalToday     = reservations.filter(r => r.checkInDate  === TODAY).length;

  /* ── Room summary ── */
  const roomCounts = useMemo(() => {
    const map = {};
    rooms.forEach(r => { map[r.status] = (map[r.status] ?? 0) + 1; });
    return map;
  }, [rooms]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = reservations;
    if (filter !== 'All') list = list.filter(r => r.status === filter);
    if (dateFilter) list = list.filter(r => r.checkInDate === dateFilter || r.checkOutDate === dateFilter);
    if (search) list = list.filter(r =>
      `${r.guestName} ${r.roomNumber}`.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [reservations, filter, dateFilter, search]);

  /* ── Actions ── */
  const handleCheckIn = async (res) => {
    if (res.checkInDate > TODAY) {
      alert(`Check-in is not allowed before the scheduled date (${res.checkInDate}).`);
      return;
    }
    setActionLoading(res.reservationId);
    try {
      const updated = await reservationService.checkIn(res.reservationId);
      setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));
      setDrawerRes(null);
      if (updated.accessToken) {
        setPortalInfo({
          guestName:  res.guestName,
          roomNumber: res.roomNumber,
          url: `${window.location.origin}/guest/${updated.accessToken}`,
        });
      }
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleCheckOut = async (id) => {
    if (!window.confirm('Check out this guest now?')) return;
    setActionLoading(id);
    try {
      const updated = await reservationService.checkOut(id);
      setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));
      setDrawerRes(null);
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this reservation?')) return;
    setActionLoading(id);
    try {
      const updated = await reservationService.cancel(id);
      setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));
      setDrawerRes(null);
    } catch (e) { alert(e.message); }
    finally { setActionLoading(null); }
  };

  const onModifySaved = (updated) =>
    setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));

  const handleSaved = (newRes) => {
    setReservations(prev => [newRes, ...prev]);
  };

  const availableRooms = rooms.filter(r => r.status === 'Available');

  return (
    <>
      <TopBar
        title={isManager ? 'Reservations' : 'Front Desk Operations'}
        actionLabel="+ New Reservation"
        onAction={() => setShowModal(true)}
      />

      <div className="page-content">
        {/* Hotel picker (multiple hotels) */}
        {hotels.length > 1 && (
          <div style={{ marginBottom: '1rem', maxWidth: 300 }}>
            <select className="rx-select" style={{ marginBottom: 0 }}
              value={hotelId} onChange={e => setHotelId(e.target.value)}>
              <option value="all">All Hotels</option>
              {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          </div>
        )}

        {/* Stats */}
        <div className="rx-stats">
          <div className="rx-stat-card">
            <div className="rx-stat-label">EXPECTED ARRIVALS</div>
            <div className="rx-stat-value" style={{ color: '#4f46e5' }}>
              {hotelId ? arrivalsToday : '—'}
            </div>
            <div className={`rx-stat-sub ${arrivalsToday > 0 ? 'orange' : 'muted'}`}>
              {hotelId ? `${totalToday} total check-ins today` : 'Select a hotel'}
            </div>
          </div>
          <div className="rx-stat-card">
            <div className="rx-stat-label">OCCUPIED ROOMS</div>
            <div className="rx-stat-value" style={{ color: '#1d4ed8' }}>
              {hotelId ? checkedIn : '—'}
            </div>
            <div className={`rx-stat-sub ${checkedIn > 0 ? 'green' : 'muted'}`}>
              {hotelId ? `of ${rooms.length} total rooms` : 'No data'}
            </div>
          </div>
          <div className="rx-stat-card">
            <div className="rx-stat-label">CHECKOUTS TODAY</div>
            <div className="rx-stat-value" style={{ color: '#dc2626' }}>
              {hotelId ? checkoutsToday : '—'}
            </div>
            <div className={`rx-stat-sub ${checkoutsToday > 0 ? 'orange' : 'muted'}`}>
              {hotelId ? 'Due for checkout' : 'No data'}
            </div>
          </div>
          <div className="rx-stat-card">
            <div className="rx-stat-label">AVAILABLE ROOMS</div>
            <div className="rx-stat-value" style={{ color: '#16a34a' }}>
              {hotelId ? availableRooms.length : '—'}
            </div>
            <div className={`rx-stat-sub ${availableRooms.length > 0 ? 'green' : 'muted'}`}>
              {hotelId ? 'Ready for check-in' : 'No data'}
            </div>
          </div>
        </div>

        <div className="rx-body">
          {/* Reservations table */}
          <div className="rx-table-card">
            <div className="rx-table-header">
              <span className="rx-table-title">Reservations</span>
              <input
                className="rx-search"
                placeholder="Search guest or room…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <input
                type="date"
                className="rx-search"
                style={{ maxWidth: 160 }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                title="Filter by check-in / check-out date"
              />
              {dateFilter && (
                <button className="btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear date</button>
              )}
            </div>

            {/* Status filter tabs */}
            <div className="rx-filter-tabs">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  className={`rx-filter-tab${filter === f.key ? ' active' : ''}`}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                  <span className="rx-filter-count">
                    {f.key === 'All' ? reservations.length : reservations.filter(r => r.status === f.key).length}
                  </span>
                </button>
              ))}
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>GUEST</th>
                  {hotelId === 'all' && <th>HOTEL</th>}
                  <th>ROOM</th>
                  <th>DATES</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                  <th style={{ width:32 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={hotelId === 'all' ? 7 : 6} className="empty-state">
                      {hotelId ? 'No reservations match the filter.' : 'Select a hotel to view reservations.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map(r => {
                    return (
                      <tr key={r.reservationId} onClick={() => setDrawerRes(r)} style={{ cursor:'pointer' }}>
                        <td>
                          <div className="staff-member-cell">
                            <div className="staff-avatar" style={{ background: '#4f46e5' }}>
                              {initials(r.guestName)}
                            </div>
                            <div>
                              <div className="fw-600">{r.guestName}</div>
                              <div className="text-muted text-sm">{r.guestPhone || r.guestEmail || '—'}</div>
                            </div>
                          </div>
                        </td>
                        {hotelId === 'all' && <td className="text-muted">{r.hotelName ?? '—'}</td>}
                        <td>
                          <div className="fw-600">Room {r.roomNumber}</div>
                          <div className="text-muted text-sm">{r.roomTypeName} · {r.floor}</div>
                        </td>
                        <td>
                          <div>{r.checkInDate} → {r.checkOutDate}</div>
                          <div className="text-muted text-sm">{r.nights} night{r.nights !== 1 ? 's' : ''}</div>
                        </td>
                        <td>
                          <div className="fw-600">₹{r.totalAmount?.toLocaleString()}</div>
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[r.status] ?? 'badge-gray'}`}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{ color:'#d1d5db', textAlign:'center', fontSize:'1.25rem', width:32 }}>›</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right panel */}
          <div className="rx-right-panel">
            {/* Room summary */}
            <div className="rx-panel-card">
              <div className="rx-panel-title" style={{ textAlign: 'left', marginBottom: '.75rem' }}>Room Summary</div>
              {ROOM_SUMMARY_LABELS.map(s => (
                <div key={s.label} className="rx-room-row">
                  <span className="rx-room-dot" style={{ background: s.color }} />
                  <span className="rx-room-label">{s.label}</span>
                  <span className="rx-room-count">{roomCounts[s.key] ?? 0}</span>
                </div>
              ))}
              <div className="rx-room-total">
                <span>Total Rooms</span>
                <span>{rooms.length}</span>
              </div>
            </div>

            {/* QR panel */}
            <div className="rx-panel-card">
              <div className="rx-qr-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="3" height="3" rx=".5"/>
                  <rect x="18" y="14" width="3" height="3" rx=".5"/><rect x="14" y="18" width="3" height="3" rx=".5"/>
                  <rect x="18" y="18" width="3" height="3" rx=".5"/>
                </svg>
              </div>
              <div className="rx-panel-title">Guest Portal Link</div>
              <div className="rx-panel-sub">Share the portal link with a checked-in guest.</div>
              <div className="rx-panel-label">CHECKED-IN ROOM</div>
              <QrPanel reservations={reservations} />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <NewReservationModal
          onClose={() => setShowModal(false)}
          onSaved={handleSaved}
        />
      )}

      {drawerRes && (
        <ReservationDrawer
          r={drawerRes}
          onClose={() => setDrawerRes(null)}
          onCheckin={() => handleCheckIn(drawerRes)}
          onCheckout={() => handleCheckOut(drawerRes.reservationId)}
          onModify={() => { const res = drawerRes; setDrawerRes(null); setModifyTarget(res); }}
          onCancel={() => handleCancel(drawerRes.reservationId)}
          onChangeRoom={() => { const res = drawerRes; setDrawerRes(null); setChangeRoomTarget(res); }}
          busy={actionLoading === drawerRes.reservationId}
        />
      )}

      {modifyTarget && (
        <ModifyModal
          reservation={modifyTarget}
          onClose={() => setModifyTarget(null)}
          onSaved={onModifySaved}
        />
      )}

      {changeRoomTarget && (
        <ChangeRoomModal
          reservation={changeRoomTarget}
          onClose={() => setChangeRoomTarget(null)}
          onSaved={(updated) => {
            setReservations(prev => prev.map(r => r.reservationId === updated.reservationId ? updated : r));
            setChangeRoomTarget(null);
          }}
        />
      )}

      {/* Portal link popup after check-in */}
      {portalInfo && (
        <div className="modal-backdrop" onClick={() => setPortalInfo(null)}>
          <div className="modal" style={{ maxWidth: 420, padding: '1.75rem' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2.5rem' }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#111827', marginTop: '.4rem' }}>
                Checked In!
              </div>
              <div style={{ fontSize: '.85rem', color: '#6b7280', marginTop: '.25rem' }}>
                {portalInfo.guestName} · Room {portalInfo.roomNumber}
              </div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.05em',
                textTransform: 'uppercase', color: '#15803d', marginBottom: '.4rem' }}>
                🔗 Guest Portal Link
              </div>
              <div style={{ fontSize: '.73rem', color: '#374151', wordBreak: 'break-all',
                background: '#fff', border: '1px solid #d1fae5', borderRadius: 6,
                padding: '.4rem .6rem', marginBottom: '.6rem', fontFamily: 'monospace' }}>
                {portalInfo.url}
              </div>
              <div style={{ display: 'flex', gap: '.5rem' }}>
                <button onClick={() => navigator.clipboard.writeText(portalInfo.url)}
                  style={{ flex: 1, padding: '.4rem', border: '1px solid #86efac',
                    borderRadius: 7, background: '#dcfce7', color: '#15803d',
                    fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}>
                  📋 Copy Link
                </button>
                <button onClick={() => window.open(portalInfo.url, '_blank')}
                  style={{ flex: 1, padding: '.4rem', border: '1px solid #86efac',
                    borderRadius: 7, background: '#fff', color: '#15803d',
                    fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}>
                  🌐 Open Portal
                </button>
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}
              onClick={() => setPortalInfo(null)}>
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
