import { useState, useEffect, useMemo } from 'react';
import TopBar from '../TopBar';
import { hotelService } from '../../services/hotelService';
import { guestService } from '../../services/guestService';
import { reservationService } from '../../services/reservationService';
import './GuestDirectory.css';

const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_TABS = [
  { key: 'All',           label: 'All Guests' },
  { key: 'InHouse',       label: 'In-House' },
  { key: 'ArrivingToday', label: 'Arriving Today' },
  { key: 'CheckedOut',    label: 'Checked Out' },
];

const ID_ICON = { Passport: '🛂', 'National ID': '🪪', 'Driver License': '🚗' };

/* ── Guest History Modal ─────────────────────────────────────── */
function HistoryModal({ guest, hotelId, onClose, onNotesSaved }) {
  const [stays,   setStays]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes,       setNotes]       = useState(guest.notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved,  setNotesSaved]  = useState(false);

  useEffect(() => {
    reservationService
      .getAll({ hotelId, guestId: guest.guestId })
      .then(data => {
        setStays(data.sort((a, b) => b.reservationId - a.reservationId));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const saveNotes = async () => {
    setSavingNotes(true); setNotesSaved(false);
    try {
      await guestService.updateNotes(guest.guestId, notes);
      onNotesSaved?.(guest.guestId, notes);
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch (e) { alert(e.message); }
    finally { setSavingNotes(false); }
  };

  const totalSpend = stays.reduce((s, r) => s + (r.totalAmount || 0), 0);

  function stayBadge(status) {
    const map = {
      CheckedIn:  'gd-badge gd-badge--checkedin',
      Confirmed:  'gd-badge gd-badge--confirmed',
      CheckedOut: 'gd-badge gd-badge--checkedout',
      Cancelled:  'gd-badge gd-badge--cancelled',
      Pending:    'gd-badge gd-badge--pending',
    };
    return map[status] || 'gd-badge';
  }

  return (
    <div className="gd-overlay" onClick={onClose}>
      <div className="gd-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gd-modal-head">
          <div>
            <div className="gd-modal-name">{guest.fullName}</div>
            <div className="gd-modal-contacts">
              {guest.phone && <span>📞 {guest.phone}</span>}
              {guest.email && <span>✉ {guest.email}</span>}
              {guest.idType && (
                <span>{ID_ICON[guest.idType] || '📄'} {guest.idType}
                  {guest.idNumber ? `: ${guest.idNumber}` : ''}</span>
              )}
            </div>
          </div>
          <button className="gd-modal-x" onClick={onClose}>✕</button>
        </div>

        {/* Summary strip */}
        <div className="gd-hist-summary">
          <div className="gd-hist-stat">
            <span className="gd-hist-val">{stays.length}</span>
            <span className="gd-hist-lbl">Total Stays</span>
          </div>
          <div className="gd-hist-stat">
            <span className="gd-hist-val">₹{Number(totalSpend).toLocaleString('en-IN')}</span>
            <span className="gd-hist-lbl">Total Spend</span>
          </div>
          {guest.firstStayDate && (
            <div className="gd-hist-stat">
              <span className="gd-hist-val">{guest.firstStayDate}</span>
              <span className="gd-hist-lbl">First Visit</span>
            </div>
          )}
        </div>

        {/* Stays list */}
        <div className="gd-hist-list">
          {loading && <div className="gd-hist-empty">Loading…</div>}
          {!loading && stays.length === 0 && <div className="gd-hist-empty">No stays found.</div>}
          {stays.map(s => (
            <div key={s.reservationId} className="gd-hist-item">
              <div className="gd-hist-left">
                <div className="gd-hist-room">Room {s.roomNumber} — {s.roomTypeName}</div>
                <div className="gd-hist-dates">
                  {s.checkInDate} → {s.checkOutDate}
                  <span className="gd-hist-nights"> · {s.nights} night{s.nights !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="gd-hist-right">
                <div className="gd-hist-amount">₹{Number(s.totalAmount || 0).toLocaleString('en-IN')}</div>
                <span className={stayBadge(s.status)}>{s.status}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Guest notes */}
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <div style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '.4rem' }}>
            Guest Notes
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Preferences, special requests, flags…"
            rows={3}
            style={{
              width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8,
              padding: '.6rem .75rem', fontSize: '.85rem', fontFamily: 'inherit', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '.6rem', marginTop: '.5rem' }}>
            {notesSaved && <span style={{ fontSize: '.78rem', color: '#16a34a', fontWeight: 600 }}>✓ Saved</span>}
            <button
              className="btn-primary"
              disabled={savingNotes}
              onClick={saveNotes}
            >
              {savingNotes ? 'Saving…' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function GuestDirectory() {
  const [hotels,        setHotels]        = useState([]);
  const [hotelId,       setHotelId]       = useState('');
  const [guests,        setGuests]        = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [searchText,    setSearchText]    = useState('');
  const [statusTab,     setStatusTab]     = useState('All');
  const [historyTarget,   setHistoryTarget]   = useState(null);
  const [expandedGuests,  setExpandedGuests]  = useState(new Set());

  function toggleExpand(guestId) {
    setExpandedGuests(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId); else next.add(guestId);
      return next;
    });
  }

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
      else if (h.length > 1) setHotelId('all');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setGuests([]); return; }
    setLoading(true);
    guestService.getAll(hotelId === 'all' ? {} : { hotelId })
      .then(data => { setGuests(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [hotelId]);

  /* Stats computed from full dataset */
  const stats = useMemo(() => ({
    total:     guests.length,
    inHouse:   guests.filter(g => g.reservationStatus === 'CheckedIn').length,
    arriving:  guests.filter(g => g.reservationStatus === 'Confirmed' && g.checkInDate === TODAY).length,
    departing: guests.filter(g => g.reservationStatus === 'CheckedIn' && g.checkOutDate === TODAY).length,
  }), [guests]);

  /* Table data after tab + search filter */
  const filtered = useMemo(() => {
    let list = guests;

    if (statusTab === 'InHouse')
      list = list.filter(g => g.reservationStatus === 'CheckedIn');
    else if (statusTab === 'ArrivingToday')
      list = list.filter(g => g.reservationStatus === 'Confirmed' && g.checkInDate === TODAY);
    else if (statusTab === 'CheckedOut')
      list = list.filter(g => g.reservationStatus === 'CheckedOut');

    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(g =>
        g.fullName?.toLowerCase().includes(q) ||
        g.phone?.includes(q) ||
        g.email?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [guests, statusTab, searchText]);

  function badgeClass(status) {
    return {
      CheckedIn:  'gd-badge gd-badge--checkedin',
      Confirmed:  'gd-badge gd-badge--confirmed',
      CheckedOut: 'gd-badge gd-badge--checkedout',
      Cancelled:  'gd-badge gd-badge--cancelled',
      Pending:    'gd-badge gd-badge--pending',
    }[status] || 'gd-badge';
  }

  function statusLabel(g) {
    if (g.reservationStatus === 'CheckedIn')
      return 'IN-HOUSE';
    if (g.reservationStatus === 'Confirmed' && g.checkInDate === TODAY)
      return 'ARRIVING TODAY';
    if (g.reservationStatus === 'Confirmed')
      return 'CONFIRMED';
    if (g.reservationStatus === 'CheckedOut')
      return 'CHECKED OUT';
    if (g.reservationStatus === 'Cancelled')
      return 'CANCELLED';
    return g.reservationStatus || '—';
  }

  const copyPortalLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/guest/${token}`);
    alert('Portal link copied to clipboard!');
  };

  return (
    <>
      <TopBar title="Guest Directory" />

      <div className="page-content gd-page">
        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select className="gd-hotel-select" value={hotelId}
            onChange={e => setHotelId(e.target.value)}>
            <option value="all">All Hotels</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Stats row */}
        <div className="gd-stats">
          <div className="gd-stat">
            <div className="gd-stat-num">{stats.total}</div>
            <div className="gd-stat-lbl">Total Guests</div>
          </div>
          <div className="gd-stat gd-stat--green">
            <div className="gd-stat-num">{stats.inHouse}</div>
            <div className="gd-stat-lbl">In-House</div>
          </div>
          <div className="gd-stat gd-stat--blue">
            <div className="gd-stat-num">{stats.arriving}</div>
            <div className="gd-stat-lbl">Arriving Today</div>
          </div>
          <div className="gd-stat gd-stat--orange">
            <div className="gd-stat-num">{stats.departing}</div>
            <div className="gd-stat-lbl">Departing Today</div>
          </div>
        </div>

        {/* Controls */}
        <div className="gd-controls">
          <div className="gd-tabs">
            {STATUS_TABS.map(t => {
              const count = t.key === 'InHouse' ? stats.inHouse
                : t.key === 'ArrivingToday' ? stats.arriving : null;
              return (
                <button key={t.key}
                  className={`gd-tab${statusTab === t.key ? ' gd-tab--active' : ''}`}
                  onClick={() => setStatusTab(t.key)}>
                  {t.label}
                  {count > 0 && <span className="gd-tab-pip">{count}</span>}
                </button>
              );
            })}
          </div>
          <input className="gd-search" placeholder="Search name, phone, email…"
            value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>

        {/* Table */}
        {loading ? (
          <div className="gd-empty">Loading guests…</div>
        ) : filtered.length === 0 ? (
          <div className="gd-empty">
            {hotelId ? 'No guests match your filter.' : 'Select a hotel to view the guest directory.'}
          </div>
        ) : (
          <div className="gd-table-wrap">
            <table className="gd-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  {hotelId === 'all' && <th>Hotel</th>}
                  <th>Contact</th>
                  <th>Room / Type</th>
                  <th>Stay Period</th>
                  <th>Status</th>
                  <th className="right">Total Spend</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.flatMap(g => {
                  const isExp    = expandedGuests.has(g.guestId);
                  const hasCoOcc = g.coOccupants?.length > 0;

                  const primary = (
                    <tr key={`g-${g.guestId}`}
                        className={hasCoOcc ? (isExp ? 'gd-row-clickable gd-row-expanded' : 'gd-row-clickable') : ''}
                        style={hasCoOcc ? { cursor: 'pointer' } : {}}
                        onClick={() => hasCoOcc && toggleExpand(g.guestId)}>

                      {/* Guest */}
                      <td>
                        <div className="gd-name">
                          {hasCoOcc && <span className="gd-expand-icon">{isExp ? '▾' : '▸'}</span>}
                          {g.fullName}
                          {g.notes && <span title="Has notes" style={{ marginLeft: '.35rem' }}>📝</span>}
                        </div>
                        {g.idType && (
                          <div className="gd-id-tag">{ID_ICON[g.idType] || '\uD83D\uDCC4'} {g.idType}</div>
                        )}
                        <div className="gd-visits">
                          {g.totalStays} visit{g.totalStays !== 1 ? 's' : ''}
                          {hasCoOcc && <span className="gd-pax"> · {g.coOccupants.length + 1} pax</span>}
                        </div>
                      </td>

                      {hotelId === 'all' && <td className="gd-muted">{g.hotelName ?? '—'}</td>}

                      {/* Contact */}
                      <td>
                        {g.phone && <div className="gd-contact">{g.phone}</div>}
                        {g.email && <div className="gd-contact gd-contact--em">{g.email}</div>}
                        {!g.phone && !g.email && <span className="gd-muted">—</span>}
                      </td>

                      {/* Room */}
                      <td>
                        {g.roomNumber
                          ? <><div className="gd-room-num">Room {g.roomNumber}</div>
                              <div className="gd-room-type">{g.roomTypeName}</div></>
                          : <span className="gd-muted">—</span>}
                      </td>

                      {/* Stay period */}
                      <td>
                        {g.checkInDate
                          ? <><div className="gd-dates">{g.checkInDate} → {g.checkOutDate}</div>
                              <div className="gd-nights-lbl">{g.nights} night{g.nights !== 1 ? 's' : ''}</div></>
                          : <span className="gd-muted">—</span>}
                      </td>

                      {/* Status */}
                      <td>
                        <span className={badgeClass(g.reservationStatus)}>{statusLabel(g)}</span>
                      </td>

                      {/* Total spend */}
                      <td className="right">
                        <span className="gd-spend">₹{Number(g.totalSpend || 0).toLocaleString('en-IN')}</span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="gd-act">
                          <button className="gd-link gd-link--hist"
                            onClick={e => { e.stopPropagation(); setHistoryTarget(g); }}>
                            View History
                          </button>
                          {g.reservationStatus === 'CheckedIn' && g.accessToken && (
                            <button className="gd-link gd-link--portal"
                              onClick={e => { e.stopPropagation(); copyPortalLink(g.accessToken); }}>
                              Portal Link
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );

                  const coRows = (isExp && hasCoOcc)
                    ? g.coOccupants.map(co => (
                        <tr key={`co-${co.additionalGuestId}`} className="gd-corow">
                          <td>
                            <div className="gd-corow-guest">
                              <span className="gd-corow-indent">└</span>
                              <div>
                                <div className="gd-corow-name">{co.fullName}</div>
                                {co.idType && (
                                  <div className="gd-corow-idtag">
                                    {ID_ICON[co.idType] || '\uD83D\uDCC4'} {co.idType}{co.idNumber ? ` · ${co.idNumber}` : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          {hotelId === 'all' && <td className="gd-muted">—</td>}
                          <td><span className="gd-muted">—</span></td>
                          <td>
                            {g.roomNumber
                              ? <><div className="gd-room-num">Room {g.roomNumber}</div>
                                  <div className="gd-room-type">{g.roomTypeName}</div></>
                              : <span className="gd-muted">—</span>}
                          </td>
                          <td>
                            {g.checkInDate
                              ? <><div className="gd-dates">{g.checkInDate} → {g.checkOutDate}</div>
                                  <div className="gd-nights-lbl">{g.nights} night{g.nights !== 1 ? 's' : ''}</div></>
                              : <span className="gd-muted">—</span>}
                          </td>
                          <td><span className={badgeClass(g.reservationStatus)}>{statusLabel(g)}</span></td>
                          <td className="right"><span className="gd-muted">—</span></td>
                          <td><span className="gd-corow-role">Co-occupant</span></td>
                        </tr>
                      ))
                    : [];

                  return [primary, ...coRows];
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {historyTarget && (
        <HistoryModal
          guest={historyTarget}
          hotelId={hotelId === 'all' ? undefined : Number(hotelId)}
          onClose={() => setHistoryTarget(null)}
          onNotesSaved={(guestId, notes) =>
            setGuests(prev => prev.map(g => g.guestId === guestId ? { ...g, notes } : g))}
        />
      )}
    </>
  );
}
