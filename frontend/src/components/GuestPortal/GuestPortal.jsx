import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Home, Compass, Receipt, User, KeyRound, UtensilsCrossed,
  Sparkles, Wrench, PhoneCall, ChevronRight,
  MapPin, Phone as PhoneIcon, Mail, Wifi, Waves, Dumbbell, Coffee,
} from 'lucide-react';
import './GuestPortal.css';

const API_BASE = 'http://localhost:5291/api';

/* Department → icon/label/color, shared by service tiles + request cards */
const DEPT_META = {
  Housekeeping: { icon: Sparkles,        label: 'Housekeeping', color: 'green'  },
  RoomService:  { icon: UtensilsCrossed, label: 'Room Service', color: 'amber'  },
  Maintenance:  { icon: Wrench,          label: 'Maintenance',  color: 'red'    },
  Other:        { icon: PhoneCall,       label: 'Reception',    color: 'indigo' },
};

const SERVICES = [
  { key: 'clean', department: 'Housekeeping', title: 'Room Cleaning',      sub: 'Regular housekeeping & dusting' },
  { key: 'linen', department: 'Housekeeping', title: 'Toiletries & Linen', sub: 'Towels, pillows, soap, etc.'    },
  { key: 'maint', department: 'Maintenance',  title: 'Maintenance',        sub: 'AC, TV, or lighting issues'     },
  { key: 'front', department: 'Other',        title: 'Talk to Reception', sub: 'Live chat or direct call'        },
];

const AMENITIES = [
  { icon: Wifi,     label: 'Free WiFi'  },
  { icon: Waves,    label: 'Pool'       },
  { icon: Dumbbell, label: 'Gym'        },
  { icon: Coffee,   label: 'Restaurant' },
];

const TABS = [
  { key: 'home',    label: 'Home',    icon: Home    },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'bill',    label: 'My Bill', icon: Receipt },
  { key: 'profile', label: 'Profile', icon: User    },
];

function fmt(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN');
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function statusLabel(status) {
  return status === 'InProgress' ? 'In Progress' : status;
}

/* ── Bottom sheet used for all quick-request tiles ─────────────── */
function RequestSheet({ meta, onClose, onSubmit }) {
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const Icon = meta.icon;

  const submit = async () => {
    setSaving(true);
    try {
      await onSubmit({ department: meta.department, title: meta.title, description: description.trim() || null });
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gpm-overlay" onClick={onClose}>
      <div className="gpm-sheet" onClick={e => e.stopPropagation()}>
        <div className="gpm-sheet-handle" />
        <div className={`gpm-sheet-icon gpm-icon--${meta.color || 'indigo'}`}><Icon size={22} /></div>
        <h3 className="gpm-sheet-title">{meta.title}</h3>
        <p className="gpm-sheet-sub">{meta.sub || 'Let us know if you need anything specific.'}</p>
        <textarea
          className="gpm-sheet-textarea"
          placeholder="Add a note (optional)…"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button className="gpm-sheet-submit" disabled={saving} onClick={submit}>
          {saving ? 'Sending…' : 'Send Request'}
        </button>
      </div>
    </div>
  );
}

/* ── Digital Key sheet ────────────────────────────────────────── */
function KeySheet({ stay, token, onClose }) {
  return (
    <div className="gpm-overlay" onClick={onClose}>
      <div className="gpm-sheet gpm-key-sheet" onClick={e => e.stopPropagation()}>
        <div className="gpm-sheet-handle" />
        <h3 className="gpm-sheet-title">Digital Room Key</h3>
        <div className="gpm-key-qr"><QRCodeSVG value={`ROOM:${stay.roomNumber}:${token}`} size={176} /></div>
        <div className="gpm-key-room">Room {stay.roomNumber}</div>
        <p className="gpm-sheet-sub">Hold this code up to the door lock or show it at reception to access your room.</p>
      </div>
    </div>
  );
}

/* ── Explore tab ──────────────────────────────────────────────── */
function ExploreTab({ stay }) {
  const address = [stay.hotelAddress, stay.hotelCity, stay.hotelCountry].filter(Boolean).join(', ');
  return (
    <div className="gpm-page">
      <h2 className="gpm-page-title">Explore {stay.hotelName}</h2>
      <div className="gpm-card">
        <div className="gpm-info-row"><MapPin size={16} /><span>{address || 'Address unavailable'}</span></div>
        {stay.hotelPhone && <div className="gpm-info-row"><PhoneIcon size={16} /><span>{stay.hotelPhone}</span></div>}
        {stay.hotelEmail && <div className="gpm-info-row"><Mail size={16} /><span>{stay.hotelEmail}</span></div>}
      </div>
      <h3 className="gpm-sub-title">Amenities</h3>
      <div className="gpm-amenity-grid">
        {AMENITIES.map(a => (
          <div key={a.label} className="gpm-amenity-card">
            <a.icon size={20} />
            <span>{a.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── My Bill tab ──────────────────────────────────────────────── */
function BillTab({ bill }) {
  if (!bill) return <div className="gpm-page-loading">Loading your bill…</div>;
  return (
    <div className="gpm-page">
      <h2 className="gpm-page-title">My Bill</h2>
      <div className="gpm-bill-summary">
        <div className="gpm-bill-stat">
          <span>Total</span>
          <strong>{fmt(bill.totalAmount)}</strong>
        </div>
        <div className="gpm-bill-stat">
          <span>Paid</span>
          <strong className="gpm-green">{fmt(bill.amountPaid)}</strong>
        </div>
        <div className="gpm-bill-stat">
          <span>Outstanding</span>
          <strong className={bill.outstandingAmount > 0 ? 'gpm-red' : 'gpm-muted'}>{fmt(bill.outstandingAmount)}</strong>
        </div>
      </div>
      <span className={`gpm-status-badge gpm-status--${bill.paymentStatus.toLowerCase()}`}>{bill.paymentStatus}</span>

      <h3 className="gpm-sub-title">Transactions</h3>
      {bill.transactions.length === 0 ? (
        <div className="gpm-empty">No transactions yet.</div>
      ) : (
        <div className="gpm-tx-list">
          {bill.transactions.map(t => (
            <div key={t.paymentId} className="gpm-tx-row">
              <div>
                <div className="gpm-tx-method">{t.paymentMethod || '—'}{t.status === 'Refunded' ? ' · Refund' : ''}</div>
                <div className="gpm-tx-date">{fmtDateTime(t.paidAt)}</div>
              </div>
              <div className={t.status === 'Refunded' ? 'gpm-tx-amt gpm-red' : 'gpm-tx-amt'}>
                {t.status === 'Refunded' ? '−' : ''}{fmt(t.amount)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Profile tab ──────────────────────────────────────────────── */
function ProfileTab({ stay }) {
  return (
    <div className="gpm-page">
      <div className="gpm-profile-avatar">{initials(stay.guestName)}</div>
      <h2 className="gpm-page-title gpm-center">{stay.guestName}</h2>

      <div className="gpm-card">
        {stay.guestPhone && <div className="gpm-info-row"><PhoneIcon size={16} /><span>{stay.guestPhone}</span></div>}
        {stay.guestEmail && <div className="gpm-info-row"><Mail size={16} /><span>{stay.guestEmail}</span></div>}
        {!stay.guestPhone && !stay.guestEmail && <div className="gpm-info-row"><span>No contact info on file.</span></div>}
      </div>

      <h3 className="gpm-sub-title">Stay Details</h3>
      <div className="gpm-card">
        <div className="gpm-info-row gpm-info-between"><span>Room</span><strong>{stay.roomNumber} · {stay.roomType}</strong></div>
        <div className="gpm-info-row gpm-info-between"><span>Check-In</span><strong>{fmtDate(stay.checkInDate)}</strong></div>
        <div className="gpm-info-row gpm-info-between"><span>Check-Out</span><strong>{fmtDate(stay.checkOutDate)}</strong></div>
      </div>

      <div className="gpm-footer-note">Need urgent help? Call the front desk anytime — 24/7 service available.</div>
    </div>
  );
}

/* ── Home tab ─────────────────────────────────────────────────── */
function HomeTab({ stay, onOpenKey, onOpenRequest }) {
  const activeReq = useMemo(
    () => stay.requests.find(r => r.status !== 'Completed' && r.status !== 'Archived'),
    [stay.requests]
  );
  const recent = stay.requests.slice(0, 3);

  return (
    <div className="gpm-page">
      <div className="gpm-quick-row">
        <button className="gpm-quick-card" onClick={onOpenKey}>
          <span className="gpm-quick-icon gpm-icon--indigo"><KeyRound size={20} /></span>
          <span>Digital Key</span>
        </button>
        <button
          className="gpm-quick-card"
          onClick={() => onOpenRequest({ department: 'RoomService', title: 'In-Room Dining', sub: 'Order food & beverages to your room', icon: UtensilsCrossed, color: 'amber' })}
        >
          <span className="gpm-quick-icon gpm-icon--amber"><UtensilsCrossed size={20} /></span>
          <span>In-Room Dining</span>
        </button>
      </div>

      <div className="gpm-section-head">
        <h3>Guest Services</h3>
        <span className="gpm-section-hint">Tap to request</span>
      </div>
      <div className="gpm-service-list">
        {SERVICES.map(s => {
          const meta = DEPT_META[s.department];
          const Icon = meta.icon;
          return (
            <button key={s.key} className="gpm-service-row" onClick={() => onOpenRequest({ ...s, icon: Icon, color: meta.color })}>
              <span className={`gpm-service-icon gpm-icon--${meta.color}`}><Icon size={18} /></span>
              <span className="gpm-service-text">
                <span className="gpm-service-title">{s.title}</span>
                <span className="gpm-service-sub">{s.sub}</span>
              </span>
              <ChevronRight size={18} className="gpm-chevron" />
            </button>
          );
        })}
      </div>

      {activeReq && (
        <div className="gpm-active-card">
          <div className="gpm-active-head"><span className="gpm-active-dot" />Active Request</div>
          <div className="gpm-active-body">
            <span className={`gpm-active-icon gpm-icon--${DEPT_META[activeReq.department]?.color || 'indigo'}`}>
              {(() => { const AIcon = DEPT_META[activeReq.department]?.icon || PhoneCall; return <AIcon size={18} />; })()}
            </span>
            <div className="gpm-active-text">
              <div className="gpm-active-title">{activeReq.title}</div>
              <div className="gpm-active-sub">{DEPT_META[activeReq.department]?.label || activeReq.department} · {activeReq.timeAgo}</div>
            </div>
            <span className={`gpm-req-badge gpm-badge--${activeReq.status.toLowerCase()}`}>{statusLabel(activeReq.status)}</span>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h3 className="gpm-sub-title">Recent Requests</h3>
          <div className="gpm-tx-list">
            {recent.map(r => (
              <div key={r.requestId} className="gpm-tx-row">
                <div>
                  <div className="gpm-tx-method">{r.title}</div>
                  <div className="gpm-tx-date">{DEPT_META[r.department]?.label || r.department} · {r.timeAgo}</div>
                </div>
                <span className={`gpm-req-badge gpm-badge--${r.status.toLowerCase()}`}>{statusLabel(r.status)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function GuestPortal() {
  const { token } = useParams();
  const [stay,    setStay]    = useState(null);
  const [bill,    setBill]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState('home');
  const [sheetMeta, setSheetMeta] = useState(null);
  const [showKey,   setShowKey]   = useState(false);
  const [toast,     setToast]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/guest-portal/${token}`).then(r => {
        if (!r.ok) throw new Error('Invalid or expired guest session.');
        return r.json();
      }),
      fetch(`${API_BASE}/guest-portal/${token}/bill`).then(r => r.ok ? r.json() : null).catch(() => null),
    ])
      .then(([stayData, billData]) => {
        setStay(stayData);
        setBill(billData);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [token]);

  const submitRequest = async ({ department, title, description }) => {
    const res = await fetch(`${API_BASE}/guest-portal/${token}/requests`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department, title, description }),
    });
    if (!res.ok) throw new Error('Failed to submit request.');
    const newReq = await res.json();
    setStay(prev => ({ ...prev, requests: [newReq, ...prev.requests] }));
    setToast(`✓ "${title}" request sent!`);
    setTimeout(() => setToast(''), 3500);
  };

  if (loading) return (
    <div className="gpm-root">
      <div className="gpm-page-loading">Loading your stay details…</div>
    </div>
  );

  if (error) return (
    <div className="gpm-root">
      <div className="gpm-error">
        <span className="gpm-error-icon">🔒</span>
        <strong>{error}</strong>
        <span>Please contact the front desk for assistance.</span>
      </div>
    </div>
  );

  return (
    <div className="gpm-root">
      <div className="gpm-scroll">
        {/* ── Header (shown on every tab) ── */}
        <div className="gpm-header">
          <div className="gpm-header-top">
            <div className="gpm-brand">🏨 {stay.hotelName}</div>
          </div>
          <div className="gpm-welcome">Welcome back,<br /><strong>{stay.guestName}</strong></div>
          <div className="gpm-pills">
            <div className="gpm-pill"><span>ROOM</span><strong>{stay.roomNumber}</strong></div>
            <div className="gpm-pill"><span>CHECKOUT</span><strong>{fmtShort(stay.checkOutDate)}</strong></div>
          </div>
        </div>

        {tab === 'home'    && <HomeTab    stay={stay} onOpenKey={() => setShowKey(true)} onOpenRequest={setSheetMeta} />}
        {tab === 'explore' && <ExploreTab stay={stay} />}
        {tab === 'bill'    && <BillTab    bill={bill} />}
        {tab === 'profile' && <ProfileTab stay={stay} />}
      </div>

      {toast && <div className="gpm-toast">{toast}</div>}

      {/* ── Bottom tab bar ── */}
      <nav className="gpm-tabbar">
        {TABS.map(t => (
          <button key={t.key} className={`gpm-tab${tab === t.key ? ' gpm-tab--active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={20} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {sheetMeta && (
        <RequestSheet meta={sheetMeta} onClose={() => setSheetMeta(null)} onSubmit={submitRequest} />
      )}
      {showKey && (
        <KeySheet stay={stay} token={token} onClose={() => setShowKey(false)} />
      )}
    </div>
  );
}
