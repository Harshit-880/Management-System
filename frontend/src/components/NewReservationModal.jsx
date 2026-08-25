import { useState, useMemo, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { hotelService } from '../services/hotelService';
import { roomService } from '../services/roomService';
import { reservationService } from '../services/reservationService';

const TODAY      = new Date().toISOString().slice(0, 10);
const TOMORROW   = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const ID_TYPES   = ['Passport', 'Aadhaar', 'PAN', 'Driving Licence', 'Voter ID'];

const EMPTY_GUEST = {
  guestFirstName: '', guestLastName: '', guestPhone: '', guestEmail: '',
  idType: '', idNumber: '',
};

export default function NewReservationModal({ onClose, onSaved, presetHotelId, presetRoomId }) {
  const [bookingType, setBookingType] = useState('walkin');   // 'walkin' | 'advance'
  const [form,        setForm]        = useState(EMPTY_GUEST);
  const [checkIn,     setCheckIn]     = useState(TODAY);
  const [checkOut,    setCheckOut]    = useState(TOMORROW);
  const [hotels,      setHotels]      = useState([]);
  const [hotelId,     setHotelId]     = useState(presetHotelId ? String(presetHotelId) : '');
  const [rooms,       setRooms]       = useState([]);
  const [roomId,      setRoomId]      = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [error,       setError]       = useState('');
  const [saving,      setSaving]      = useState(false);
  const [success,     setSuccess]     = useState(null); // { guestName, roomNumber, nights, portalUrl }
  // Additional co-occupant guests
  const [extraGuests, setExtraGuests] = useState([]); // [{ fullName, idType, idNumber }]

  /* Load hotels once */
  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (presetHotelId) return;
      if (h.length === 1) setHotelId(String(h[0].hotelId));
    }).catch(() => {});
  }, []);

  /* When booking type switches, reset check-in date */
  useEffect(() => {
    if (bookingType === 'walkin') {
      setCheckIn(TODAY);
      setCheckOut(TOMORROW);
    } else {
      // Default to tomorrow for advance booking
      const next2 = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
      setCheckIn(TOMORROW);
      setCheckOut(next2);
    }
    setRoomId('');
  }, [bookingType]);

  /* Fetch available rooms whenever hotel/dates change */
  const fetchRooms = useCallback(() => {
    if (!hotelId || !checkIn || !checkOut || checkOut <= checkIn) {
      setRooms([]); return;
    }
    setLoadingRooms(true);
    setRoomId('');
    roomService.getAvailable(Number(hotelId), checkIn, checkOut)
      .then(r => {
        setRooms(r);
        setLoadingRooms(false);
        if (presetRoomId && r.some(rm => rm.roomId === presetRoomId)) {
          setRoomId(String(presetRoomId));
        }
      })
      .catch(() => setLoadingRooms(false));
  }, [hotelId, checkIn, checkOut]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  /* Extra guest helpers */
  const addExtraGuest   = () => setExtraGuests(prev => [...prev, { fullName: '', idType: '', idNumber: '' }]);
  const removeExtraGuest = (i) => setExtraGuests(prev => prev.filter((_, idx) => idx !== i));
  const setExtraField   = (i, field, val) =>
    setExtraGuests(prev => prev.map((g, idx) => idx === i ? { ...g, [field]: val } : g));

  const nights = useMemo(() => {
    const d = (new Date(checkOut) - new Date(checkIn)) / 86400000;
    return d > 0 ? Math.floor(d) : 0;
  }, [checkIn, checkOut]);

  const selectedRoom = rooms.find(r => String(r.roomId) === roomId);
  const totalAmount  = nights * (selectedRoom?.effectivePrice ?? 0);

  /* ── Submit ─────────────────────────────────────────── */
  const handleSubmit = async () => {
    if (!hotelId)             { setError('Select a hotel.');             return; }
    if (!form.guestFirstName) { setError('First name is required.');     return; }
    if (!form.guestLastName)  { setError('Last name is required.');      return; }
    if (!roomId)              { setError('Select a room.');              return; }
    if (nights <= 0)          { setError('Check-out must be after check-in.'); return; }
    // Validate additional guests have a name
    const invalidExtra = extraGuests.find(g => !g.fullName.trim());
    if (invalidExtra) { setError('All additional guests must have a full name.'); return; }
    setError(''); setSaving(true);

    try {
      // Step 1 — Create reservation (status: Confirmed)
      const res = await reservationService.create({
        hotelId:        Number(hotelId),
        roomId:         Number(roomId),
        guestFirstName: form.guestFirstName,
        guestLastName:  form.guestLastName,
        guestPhone:     form.guestPhone  || null,
        guestEmail:     form.guestEmail  || null,
        idType:         form.idType      || null,
        idNumber:       form.idNumber    || null,
        checkInDate:    checkIn,
        checkOutDate:   checkOut,
        totalAmount,
        additionalGuests: extraGuests
          .filter(g => g.fullName.trim())
          .map(g => ({ fullName: g.fullName.trim(), idType: g.idType || null, idNumber: g.idNumber || null })),
      });

      // Step 2 — For walk-in, immediately check in
      if (bookingType === 'walkin') {
        const checkedIn = await reservationService.checkIn(res.reservationId);
        const portalUrl = checkedIn.accessToken
          ? `${window.location.origin}/guest/${checkedIn.accessToken}`
          : null;
        setSuccess({
          guestName:  `${form.guestFirstName} ${form.guestLastName}`,
          roomNumber: selectedRoom?.roomNumber,
          roomType:   selectedRoom?.roomTypeName,
          nights,
          totalAmount,
          portalUrl,
          accessToken: checkedIn.accessToken,
        });
        onSaved?.(checkedIn);
      } else {
        onSaved?.(res);
        onClose();
      }
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  /* ── Success Screen ──────────────────────────────────── */
  if (success) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal new-res-modal" onClick={e => e.stopPropagation()}
          style={{ maxWidth: 480 }}>
          <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <div />
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
          <div style={{ padding: '0 1.75rem 1.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>✅</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827', margin: '0 0 .35rem' }}>
              Checked In Successfully!
            </h2>
            <p style={{ color: '#6b7280', fontSize: '.88rem', margin: '0 0 1.25rem' }}>
              {success.guestName} · Room {success.roomNumber} ({success.roomType}) · {success.nights} night{success.nights !== 1 ? 's' : ''}
            </p>
            <div style={{
              background: '#f9fafb', border: '1.5px solid #e5e7eb',
              borderRadius: 10, padding: '.6rem .75rem',
              display: 'flex', justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '.78rem', color: '#6b7280', fontWeight: 600 }}>Total Amount</span>
              <span style={{ fontWeight: 800, color: '#111827' }}>
                ₹{Number(success.totalAmount).toLocaleString('en-IN')}
              </span>
            </div>

            {success.portalUrl && (
              <div style={{
                background: '#f0fdf4', border: '1.5px solid #86efac',
                borderRadius: 10, padding: '1rem', marginBottom: '1.25rem',
                textAlign: 'left',
              }}>
                <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.05em',
                  textTransform: 'uppercase', color: '#15803d', marginBottom: '.4rem' }}>
                  🔗 Guest Portal Link
                </div>
                <div style={{
                  fontSize: '.75rem', color: '#374151', wordBreak: 'break-all',
                  background: '#fff', border: '1px solid #d1fae5', borderRadius: 6,
                  padding: '.4rem .6rem', marginBottom: '.6rem', fontFamily: 'monospace',
                }}>
                  {success.portalUrl}
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button onClick={() => { navigator.clipboard.writeText(success.portalUrl); }}
                    style={{
                      flex: 1, padding: '.42rem', border: '1px solid #86efac',
                      borderRadius: 7, background: '#dcfce7', color: '#15803d',
                      fontWeight: 700, fontSize: '.8rem', cursor: 'pointer',
                    }}>
                    📋 Copy Link
                  </button>
                  <button onClick={() => window.open(success.portalUrl, '_blank')}
                    style={{
                      flex: 1, padding: '.42rem', border: '1px solid #86efac',
                      borderRadius: 7, background: '#fff', color: '#15803d',
                      fontWeight: 700, fontSize: '.8rem', cursor: 'pointer',
                    }}>
                    🌐 Open Portal
                  </button>
                </div>
                <p style={{ fontSize: '.72rem', color: '#6b7280', marginTop: '.5rem', marginBottom: 0 }}>
                  Share this link with the guest to let them submit service requests.
                </p>
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main Form ───────────────────────────────────────── */
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal new-res-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">New Reservation</h2>
            <p className="modal-sub">Walk-in check-in or advance booking</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="new-res-body">
          {/* Booking type toggle */}
          <div className="nrm-type-row">
            <button
              className={`nrm-type-btn${bookingType === 'walkin' ? ' nrm-type-btn--active' : ''}`}
              onClick={() => setBookingType('walkin')}>
              <span className="nrm-type-icon">🚶</span>
              <div>
                <div className="nrm-type-label">Walk-in</div>
                <div className="nrm-type-sub">Check in today</div>
              </div>
            </button>
            <button
              className={`nrm-type-btn${bookingType === 'advance' ? ' nrm-type-btn--active' : ''}`}
              onClick={() => setBookingType('advance')}>
              <span className="nrm-type-icon">📅</span>
              <div>
                <div className="nrm-type-label">Advance Booking</div>
                <div className="nrm-type-sub">Future reservation</div>
              </div>
            </button>
          </div>

          {/* Hotel selector */}
          {hotels.length > 1 && (
            <div className="modal-field">
              <label>HOTEL *</label>
              <select value={hotelId} onChange={e => setHotelId(e.target.value)} disabled={!!presetHotelId}>
                <option value="">— Select hotel —</option>
                {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
              </select>
            </div>
          )}

          {/* Guest info */}
          <div className="new-res-section-label">GUEST DETAILS</div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label>FIRST NAME *</label>
              <input placeholder="First name" value={form.guestFirstName}
                onChange={e => set('guestFirstName', e.target.value)} />
            </div>
            <div className="modal-field">
              <label>LAST NAME *</label>
              <input placeholder="Last name" value={form.guestLastName}
                onChange={e => set('guestLastName', e.target.value)} />
            </div>
          </div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label>PHONE</label>
              <input placeholder="+91 00000 00000" value={form.guestPhone}
                onChange={e => set('guestPhone', e.target.value)} />
            </div>
            <div className="modal-field">
              <label>EMAIL</label>
              <input type="email" placeholder="guest@email.com" value={form.guestEmail}
                onChange={e => set('guestEmail', e.target.value)} />
            </div>
          </div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label>ID TYPE{bookingType === 'walkin' ? ' *' : ''}</label>
              <select value={form.idType} onChange={e => set('idType', e.target.value)}>
                <option value="">— Select —</option>
                {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label>ID NUMBER</label>
              <input placeholder="Document number" value={form.idNumber}
                onChange={e => set('idNumber', e.target.value)} />
            </div>
          </div>

          {/* Additional Guests (co-occupants) */}
          <div className="new-res-section-label">
            ADDITIONAL GUESTS
            <span style={{ marginLeft: 'auto', fontWeight: 400, textTransform: 'none',
              letterSpacing: 0, fontSize: '.75rem', color: '#6b7280' }}>
              Optional — for co-occupants sharing the room
            </span>
          </div>
          {extraGuests.map((g, i) => (
            <div key={i} style={{
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 9,
              padding: '.65rem .85rem', display: 'flex', flexDirection: 'column', gap: '.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '.72rem', fontWeight: 700, color: '#6b7280' }}>
                  Guest {i + 2}
                </span>
                <button onClick={() => removeExtraGuest(i)}
                  style={{ background: 'none', border: 'none', color: '#ef4444',
                    cursor: 'pointer', fontSize: '.8rem', fontWeight: 700, padding: '0 .25rem' }}>
                  ✕ Remove
                </button>
              </div>
              <div className="modal-field-row" style={{ gap: '.5rem' }}>
                <div className="modal-field">
                  <label>FULL NAME *</label>
                  <input placeholder="Full name" value={g.fullName}
                    onChange={e => setExtraField(i, 'fullName', e.target.value)} />
                </div>
              </div>
              <div className="modal-field-row" style={{ gap: '.5rem' }}>
                <div className="modal-field">
                  <label>ID TYPE</label>
                  <select value={g.idType} onChange={e => setExtraField(i, 'idType', e.target.value)}>
                    <option value="">— Select —</option>
                    {ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label>ID NUMBER</label>
                  <input placeholder="Document number" value={g.idNumber}
                    onChange={e => setExtraField(i, 'idNumber', e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <button onClick={addExtraGuest} style={{
            alignSelf: 'flex-start', background: 'none', border: '1.5px dashed #c7d2fe',
            borderRadius: 8, padding: '.4rem .85rem', color: '#4f46e5',
            fontSize: '.8rem', fontWeight: 700, cursor: 'pointer',
          }}>
            + Add Another Guest
          </button>

          {/* Stay dates */}
          <div className="new-res-section-label">STAY DATES</div>
          <div className="modal-field-row">
            <div className="modal-field">
              <label>CHECK-IN DATE{bookingType === 'walkin' ? ' (Today)' : ' *'}</label>
              <input type="date" value={checkIn}
                min={bookingType === 'walkin' ? TODAY : TODAY}
                readOnly={bookingType === 'walkin'}
                style={bookingType === 'walkin' ? { background: '#f3f4f6', color: '#6b7280' } : {}}
                onChange={e => { if (bookingType !== 'walkin') setCheckIn(e.target.value); }}
              />
            </div>
            <div className="modal-field">
              <label>CHECK-OUT DATE *</label>
              <input type="date" value={checkOut}
                min={checkIn || TODAY}
                onChange={e => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          {/* Room picker */}
          <div className="new-res-section-label">
            SELECT ROOM
            {loadingRooms && <span className="nrm-rooms-loading"> — checking availability…</span>}
            {!loadingRooms && rooms.length > 0 && (
              <span className="nrm-rooms-count"> — {rooms.length} available</span>
            )}
          </div>

          {!hotelId || nights <= 0 ? (
            <div className="nrm-rooms-hint">
              {!hotelId ? 'Select a hotel first.' : 'Pick valid check-in and check-out dates.'}
            </div>
          ) : loadingRooms ? (
            <div className="nrm-rooms-hint">Loading available rooms…</div>
          ) : rooms.length === 0 ? (
            <div className="nrm-rooms-hint nrm-rooms-hint--warn">
              ⚠ No rooms available for the selected dates. Try different dates.
            </div>
          ) : (
            <div className="nrm-room-grid">
              {rooms.map(r => (
                <button key={r.roomId}
                  className={`nrm-room-card${String(r.roomId) === roomId ? ' nrm-room-card--selected' : ''}`}
                  onClick={() => setRoomId(String(r.roomId))}>
                  <div className="nrm-room-top">
                    <span className="nrm-room-num">Room {r.roomNumber}</span>
                    <span className="nrm-room-price">₹{Number(r.effectivePrice).toLocaleString()}/night</span>
                  </div>
                  <div className="nrm-room-type">{r.roomTypeName}</div>
                  <div className="nrm-room-meta">{r.floor} · {r.capacity} guest{r.capacity !== 1 ? 's' : ''}</div>
                </button>
              ))}
            </div>
          )}

          {/* Summary strip */}
          {selectedRoom && nights > 0 && (
            <div className="new-res-summary">
              <div className="new-res-summary-row">
                <span className="text-muted text-sm">
                  {nights} night{nights > 1 ? 's' : ''} × ₹{Number(selectedRoom.effectivePrice).toLocaleString()}
                </span>
                <span className="new-res-total">₹{Number(totalAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="new-res-summary-sub">
                {selectedRoom.roomTypeName} · Room {selectedRoom.roomNumber} · {selectedRoom.floor}
              </div>
            </div>
          )}

          {error && <div className="error-msg" style={{ marginTop: '.5rem' }}>{error}</div>}
        </div>

        <div className="inv-modal-footer">
          <span className="inv-footer-note">
            {bookingType === 'walkin'
              ? '🚶 Guest will be checked in immediately.'
              : '📅 Reservation will be saved as Confirmed.'}
          </span>
          <div className="modal-footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" disabled={saving} onClick={handleSubmit}>
              {saving
                ? 'Please wait…'
                : bookingType === 'walkin'
                  ? 'Check In Now'
                  : 'Confirm Booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
