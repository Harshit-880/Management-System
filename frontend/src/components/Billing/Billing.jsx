import { useState, useEffect, useMemo } from 'react';
import TopBar from '../TopBar';
import { reservationService } from '../../services/reservationService';
import { hotelService } from '../../services/hotelService';
import { paymentService } from '../../services/paymentService';
import './Billing.css';

const TODAY = new Date().toISOString().slice(0, 10);

const METHODS = ['Cash', 'Card', 'UPI'];
const METHOD_ICON = { Cash: '💵', Card: '💳', UPI: '📲' };

function fmt(amount) {
  if (amount == null) return '₹0';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/* ── Payment Modal ────────────────────────────────────────────── */
function PaymentModal({ reservation, onClose, onPaid }) {
  // Use the real outstanding balance (accounts for partial payments/refunds
  // already recorded elsewhere, e.g. by a Manager via the Payments page)
  // instead of always charging the full booking total again.
  const total               = reservation.outstandingAmount ?? (reservation.totalAmount || 0);
  const [method, setMethod] = useState('Cash');
  const [received, setReceived] = useState(String(total));
  const [saving, setSaving] = useState(false);

  const amtReceived = parseFloat(received) || 0;
  const change      = Math.max(0, amtReceived - total);

  const process = async () => {
    if (amtReceived < total) { alert('Amount received is less than total due.'); return; }
    setSaving(true);
    try {
      await paymentService.create({
        reservationId: reservation.reservationId,
        amount: total,
        paymentMethod: method,
      });
      await reservationService.checkOut(reservation.reservationId);
      onPaid(reservation.reservationId, { method, amountPaid: amtReceived, change, paidAt: new Date() });
      onClose();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bl-modal-overlay" onClick={onClose}>
      <div className="bl-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="bl-invoice" style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: 0 }}>Collect Payment</h3>
            <div style={{ fontSize: '.82rem', color: '#6b7280', marginTop: 3 }}>
              {reservation.guestName} · Room {reservation.roomNumber} · {reservation.roomTypeName}
            </div>
          </div>

          {/* Total due highlight */}
          <div style={{
            background: '#f0f4ff', border: '1.5px solid #c7d2fe', borderRadius: 10,
            padding: '.85rem 1rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: '1.25rem',
          }}>
            <span style={{ fontSize: '.78rem', fontWeight: 700, letterSpacing: '.06em', color: '#4f46e5', textTransform: 'uppercase' }}>Total Due</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e1b4b' }}>{fmt(total)}</span>
          </div>

          {/* Payment method */}
          <div style={{ marginBottom: '1.1rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', color: '#374151', textTransform: 'uppercase', marginBottom: '.5rem' }}>
              Payment Method
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              {METHODS.map(m => (
                <button key={m} onClick={() => setMethod(m)} style={{
                  flex: 1, padding: '.6rem .4rem', borderRadius: 9,
                  border: method === m ? '2px solid #4f46e5' : '1.5px solid #e5e7eb',
                  background: method === m ? '#eef2ff' : '#fff',
                  color: method === m ? '#4f46e5' : '#374151',
                  fontWeight: method === m ? 700 : 500,
                  fontSize: '.82rem', cursor: 'pointer', transition: 'all .12s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <span style={{ fontSize: '1.15rem' }}>{METHOD_ICON[m]}</span>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Amount received */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.06em', color: '#374151', textTransform: 'uppercase', marginBottom: '.4rem' }}>
              Amount Received (₹)
            </div>
            <input type="number" min={total} step="0.01" value={received}
              onChange={e => setReceived(e.target.value)}
              style={{
                width: '100%', padding: '.65rem .85rem',
                border: '1.5px solid #e5e7eb', borderRadius: 9,
                fontSize: '1.1rem', fontWeight: 700, color: '#111827',
                outline: 'none', background: '#fafafa',
              }}
            />
          </div>

          {/* Change */}
          {change > 0 && (
            <div style={{
              background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 9,
              padding: '.6rem .85rem', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem',
            }}>
              <span style={{ fontSize: '.82rem', fontWeight: 600, color: '#15803d' }}>Change to return</span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#15803d' }}>{fmt(change)}</span>
            </div>
          )}
          {amtReceived > 0 && amtReceived < total && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9,
              padding: '.5rem .85rem', fontSize: '.8rem', color: '#dc2626', fontWeight: 600, marginBottom: '1rem',
            }}>
              ⚠ Amount is {fmt(total - amtReceived)} short of total due
            </div>
          )}

          <div style={{ display: 'flex', gap: '.65rem', justifyContent: 'flex-end' }}>
            <button className="bl-btn-close" onClick={onClose}>Cancel</button>
            <button className="bl-btn-print" disabled={saving || amtReceived < total}
              style={{ background: amtReceived >= total ? '#16a34a' : '#9ca3af', minWidth: 170 }}
              onClick={process}>
              {saving ? 'Processing…' : `✓ Confirm ${method} Payment`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Invoice Modal ────────────────────────────────────────────── */
function InvoiceModal({ reservation, hotelName, paymentInfo, onClose }) {
  const nights      = reservation.nights || 1;
  const roomCharge  = reservation.totalAmount || 0;
  const serviceCharge = 0;
  const total       = roomCharge + serviceCharge;

  const invoiceNo = `INV-${String(reservation.reservationId).padStart(5, '0')}`;
  const isPaid    = reservation.status === 'CheckedOut' || !!paymentInfo;
  const printDate = (paymentInfo?.paidAt || new Date())
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="bl-modal-overlay" onClick={onClose}>
      <div className="bl-modal" onClick={e => e.stopPropagation()}>
        <div className="bl-invoice">
          {/* Header */}
          <div className="bl-invoice-header">
            <div>
              <div className="bl-invoice-brand">🏨 {hotelName}</div>
              <div style={{ fontSize: '.75rem', color: '#6b7280', marginTop: '.25rem' }}>
                {isPaid ? 'PAYMENT RECEIPT' : 'INVOICE'}
              </div>
            </div>
            <div className="bl-invoice-meta">
              <div><strong>{invoiceNo}</strong></div>
              <div>Date: {printDate}</div>
              <div style={{
                marginTop: '.35rem', fontWeight: 700, fontSize: '.82rem',
                color: isPaid ? '#15803d' : '#d97706',
                background: isPaid ? '#dcfce7' : '#fef9c3',
                padding: '.2rem .55rem', borderRadius: 6, display: 'inline-block',
              }}>
                {isPaid
                  ? `✓ PAID${paymentInfo ? ` · ${paymentInfo.method}` : ''}`
                  : 'AWAITING PAYMENT'}
              </div>
            </div>
          </div>

          {/* Guest */}
          <div className="bl-invoice-section">
            <h4>Guest Details</h4>
            <div className="bl-invoice-row"><span>Name</span><span>{reservation.guestName}</span></div>
            {reservation.guestPhone && <div className="bl-invoice-row"><span>Phone</span><span>{reservation.guestPhone}</span></div>}
            {reservation.guestEmail && <div className="bl-invoice-row"><span>Email</span><span>{reservation.guestEmail}</span></div>}
          </div>

          {/* Stay */}
          <div className="bl-invoice-section">
            <h4>Stay Details</h4>
            <div className="bl-invoice-row"><span>Room</span><span>Room #{reservation.roomNumber} — {reservation.roomTypeName}</span></div>
            <div className="bl-invoice-row"><span>Floor</span><span>{reservation.floor || '—'}</span></div>
            <div className="bl-invoice-row"><span>Check-In</span><span>{reservation.checkInDate}</span></div>
            <div className="bl-invoice-row"><span>Check-Out</span><span>{reservation.checkOutDate}</span></div>
            <div className="bl-invoice-row"><span>Nights</span><span>{nights}</span></div>
          </div>

          {/* Charges */}
          <div className="bl-invoice-section">
            <h4>Charges</h4>
            <div className="bl-invoice-row">
              <span>Room Charges ({nights} night{nights !== 1 ? 's' : ''})</span>
              <span>{fmt(roomCharge)}</span>
            </div>
            <div className="bl-invoice-row">
              <span>Service Charges</span>
              <span style={{ color: '#2563eb' }}>{fmt(serviceCharge)}</span>
            </div>
            <div className="bl-invoice-total">
              <span>Total Amount</span>
              <span>{fmt(total)}</span>
            </div>
          </div>

          {/* Payment breakdown — only when paid */}
          {paymentInfo && (
            <div className="bl-invoice-section" style={{ marginTop: '.75rem' }}>
              <h4>Payment</h4>
              <div className="bl-invoice-row">
                <span>Method</span>
                <span>{METHOD_ICON[paymentInfo.method]} {paymentInfo.method}</span>
              </div>
              <div className="bl-invoice-row">
                <span>Amount Received</span>
                <span style={{ fontWeight: 700 }}>{fmt(paymentInfo.amountPaid)}</span>
              </div>
              {paymentInfo.change > 0 && (
                <div className="bl-invoice-row">
                  <span>Change Returned</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>{fmt(paymentInfo.change)}</span>
                </div>
              )}
            </div>
          )}

          <div className="bl-invoice-footer">
            Thank you for your stay! We hope to see you again.
          </div>
        </div>

        <div className="bl-modal-actions">
          <button className="bl-btn-close" onClick={onClose}>Close</button>
          <button className="bl-btn-print" onClick={() => window.print()}>🖨 Print Receipt</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function Billing({ hideTopBar = false }) {
  const [hotels,        setHotels]        = useState([]);
  const [hotelId,       setHotelId]       = useState('');
  const [hotelName,     setHotelName]     = useState('');
  const [reservations,  setReservations]  = useState([]);
  const [roomSearch,    setRoomSearch]    = useState('');
  const [paymentTarget, setPaymentTarget] = useState(null);           // open PaymentModal
  const [invoiceTarget, setInvoiceTarget] = useState(null);           // { res, pi }
  // session-level payment cache: reservationId → { method, amountPaid, change, paidAt }
  const [paidMap,       setPaidMap]       = useState({});
  // reservationId → real payment summary from paymentService.getOverview
  const [summaryMap,    setSummaryMap]    = useState({});

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) { setHotelId(String(h[0].hotelId)); setHotelName(h[0].hotelName); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setReservations([]); return; }
    load();
    const found = hotels.find(h => String(h.hotelId) === hotelId);
    if (found) setHotelName(found.hotelName);
  }, [hotelId]);

  const load = () => {
    if (!hotelId) return;
    // Load CheckedIn + today's CheckedOut reservations, plus the real
    // payment overview (same source of truth the Manager Payments page
    // uses) so outstanding/paid amounts stay consistent across both views.
    Promise.all([
      reservationService.getAll({ hotelId, status: 'CheckedIn' }),
      reservationService.getAll({ hotelId, status: 'CheckedOut' }),
      paymentService.getOverview(Number(hotelId)),
    ]).then(([checkedIn, checkedOut, overview]) => {
      const todayCheckouts = checkedOut.filter(r => r.checkOutDate === TODAY);
      setReservations([...checkedIn, ...todayCheckouts]);
      const map = {};
      overview.forEach(s => { map[s.reservationId] = s; });
      setSummaryMap(map);
    }).catch(() => {});
  };

  // Called when PaymentModal confirms payment
  const onPaid = (reservationId, paymentInfo) => {
    setPaidMap(prev => ({ ...prev, [reservationId]: paymentInfo }));
    load();
  };

  // Stats — derived from the real payment overview, not just reservation.status
  const stats = useMemo(() => {
    const pending   = reservations.filter(r => r.status === 'CheckedIn');
    const collected = reservations.filter(r => r.status === 'CheckedOut');
    return {
      pendingTotal:   pending.reduce((s, r) => s + (summaryMap[r.reservationId]?.outstandingAmount ?? r.totalAmount ?? 0), 0),
      pendingCount:   pending.length,
      collectedTotal: collected.reduce((s, r) => s + (summaryMap[r.reservationId]?.amountPaid ?? r.totalAmount ?? 0), 0),
    };
  }, [reservations, summaryMap]);

  // Filter by room search
  const filtered = useMemo(() => {
    if (!roomSearch.trim()) return reservations;
    const q = roomSearch.trim().toLowerCase();
    return reservations.filter(r => r.roomNumber?.toLowerCase().includes(q));
  }, [reservations, roomSearch]);

  // "Process Payment" top button — shortcut for room number search
  const quickProcess = () => {
    const target = reservations.find(
      r => r.roomNumber?.toLowerCase() === roomSearch.trim().toLowerCase() && r.status === 'CheckedIn'
    );
    if (!target) { alert('No checked-in guest found for that room number.'); return; }
    const summary = summaryMap[target.reservationId];
    setPaymentTarget({ ...target, outstandingAmount: summary ? summary.outstandingAmount : target.totalAmount });
  };

  return (
    <>
      {!hideTopBar && (
        <TopBar
          title="Billing & Invoicing"
          actionLabel="🖨 Print Daily Ledger"
          onAction={() => window.print()}
        />
      )}

      <div className="page-content bl-page">
        {/* Hotel selector */}
        {hotels.length > 1 && (
          <select
            className="bl-hotel-select"
            value={hotelId}
            onChange={e => setHotelId(e.target.value)}
          >
            <option value="">— Select hotel —</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        {/* Stats */}
        <div className="bl-stats">
          <div className="bl-stat-card">
            <div className="bl-stat-label">Pending Invoices</div>
            <div className="bl-stat-amount">{fmt(stats.pendingTotal)}</div>
            {stats.pendingCount > 0 && (
              <div className="bl-stat-warn">
                ⚠ {stats.pendingCount} Guest{stats.pendingCount !== 1 ? 's' : ''} checking out today
              </div>
            )}
          </div>
          <div className="bl-stat-card">
            <div className="bl-stat-label">Collected Today</div>
            <div className="bl-stat-amount green">{fmt(stats.collectedTotal)}</div>
            <div className="bl-stat-sub">Via Cash, Card &amp; UPI</div>
          </div>
          <div className="bl-stat-card">
            <div className="bl-stat-label">Service Revenue</div>
            <div className="bl-stat-amount purple">₹0</div>
            <div className="bl-stat-sub">Food, Spa &amp; Laundry</div>
          </div>
        </div>

        {/* Ready for Checkout table */}
        <div className="bl-section">
          <div className="bl-section-header">
            <h3 className="bl-section-title">Ready for Checkout</h3>
            <div className="bl-header-right">
              <input
                className="bl-room-search"
                placeholder="Room #"
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
              />
              <button
                className="bl-btn-process"
                onClick={quickProcess}
              >
                Process Payment
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bl-empty">
              {hotelId
                ? 'No guests ready for checkout.'
                : 'Select a hotel to view billing.'}
            </div>
          ) : (
            <table className="bl-table">
              <thead>
                <tr>
                  <th>Guest / Room</th>
                  <th className="right">Room Charges</th>
                  <th className="right">Service Charges</th>
                  <th className="right">Total Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(res => {
                  const summary    = summaryMap[res.reservationId];
                  // Fall back to reservation.status only when the overview hasn't
                  // loaded yet — real outstanding balance is the source of truth.
                  const isPaid     = summary ? summary.outstandingAmount <= 0 : res.status === 'CheckedOut';
                  const roomCharge = res.totalAmount || 0;
                  const svcCharge  = 0;
                  const total      = summary ? summary.outstandingAmount : (roomCharge + svcCharge);
                  const pi         = paidMap[res.reservationId];

                  return (
                    <tr key={res.reservationId}>
                      {/* Guest / Room */}
                      <td>
                        <div className="bl-guest-name">{res.guestName}</div>
                        <div className="bl-room-ref">{res.roomTypeName} #{res.roomNumber}</div>
                      </td>

                      {/* Room Charges */}
                      <td className="right">
                        <span className="bl-amount">{fmt(roomCharge)}</span>
                      </td>

                      {/* Service Charges */}
                      <td className="right">
                        <span className="bl-amount blue">{fmt(svcCharge)}</span>
                      </td>

                      {/* Total Due */}
                      <td className="right">
                        <span className="bl-amount bold">{fmt(total)}</span>
                      </td>

                      {/* Status */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span className={isPaid ? 'bl-badge bl-badge--paid' : 'bl-badge bl-badge--awaiting'}>
                            {isPaid
                              ? `PAID${pi ? ` · ${pi.method}` : ''}`
                              : 'AWAITING PAYMENT'}
                          </span>
                          {pi && (
                            <span style={{ fontSize: '.68rem', color: '#6b7280' }}>
                              {pi.paidAt?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="bl-action-cell">
                          {!isPaid && (
                            <button
                              className="bl-link bl-link--checkout"
                              onClick={() => setPaymentTarget({ ...res, outstandingAmount: total })}
                            >
                              Collect Payment
                            </button>
                          )}
                          <button
                            className="bl-link bl-link--invoice"
                            onClick={() => setInvoiceTarget({ res, pi })}
                          >
                            {isPaid ? 'View Receipt' : 'Preview Invoice'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {paymentTarget && (
        <PaymentModal
          reservation={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onPaid={onPaid}
        />
      )}

      {invoiceTarget && (
        <InvoiceModal
          reservation={invoiceTarget.res}
          hotelName={hotelName}
          paymentInfo={invoiceTarget.pi}
          onClose={() => setInvoiceTarget(null)}
        />
      )}
    </>
  );
}
