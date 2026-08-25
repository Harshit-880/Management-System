import { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import TopBar from '../TopBar';
import StatsCard from '../StatsCard';
import { DollarSign, Clock, AlertTriangle, Undo2 } from 'lucide-react';
import { hotelService } from '../../services/hotelService';
import { paymentService } from '../../services/paymentService';

const METHODS = ['Cash', 'Card', 'UPI'];

function fmt(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

const PAY_STATUS_BADGE = {
  Pending:   'badge-yellow',
  Partial:   'badge-orange',
  Completed: 'badge-green',
};

/* ── Collect Payment Modal ────────────────────────────────────── */
function CollectPaymentModal({ summary, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(summary.outstandingAmount));
  const [method, setMethod] = useState('Cash');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount.'); return; }
    setSaving(true); setError('');
    try {
      await paymentService.create({
        reservationId: summary.reservationId,
        amount: amt,
        paymentMethod: method,
      });
      onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Collect Payment</h2>
            <p className="modal-sub">{summary.guestName} · Room {summary.roomNumber}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-field">
            <label>Outstanding Amount</label>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{fmt(summary.outstandingAmount)}</div>
          </div>
          <div className="modal-field">
            <label>Amount to Collect (₹)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <div className="modal-footer-left" />
          <div className="modal-footer-right">
            <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn-primary" onClick={submit} disabled={saving}>
              {saving ? 'Processing…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Refund Modal (scoped to one transaction) ────────────────── */
function RefundModal({ payment, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > payment.amount) { setError(`Enter an amount up to ${fmt(payment.amount)}.`); return; }
    setSaving(true); setError('');
    try {
      await paymentService.refund(payment.paymentId, { amount: amt, reason: reason || null });
      onSaved();
      onClose();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Issue Refund</h2>
            <p className="modal-sub">{payment.guestName} · Room {payment.roomNumber} · {fmt(payment.amount)} via {payment.paymentMethod}</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg">{error}</div>}
          <div className="modal-field">
            <label>Refund Amount (₹)</label>
            <input type="number" min="0" max={payment.amount} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Reason (optional)</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Guest cancellation, overcharge…" />
          </div>
        </div>
        <div className="modal-footer">
          <div className="modal-footer-left" />
          <div className="modal-footer-right">
            <button className="btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn-danger" onClick={submit} disabled={saving}>
              {saving ? 'Processing…' : 'Confirm Refund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Payment Details / Transaction History Modal ─────────────── */
function HistoryModal({ summary, hotelId, onClose, onChanged }) {
  const [payments, setPayments] = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [refundTarget, setRefundTarget] = useState(null);

  const load = () => {
    setLoading(true);
    paymentService.getAll({ hotelId, reservationId: summary.reservationId })
      .then(p => { setPayments(p); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">Payment Details</h2>
              <p className="modal-sub">{summary.guestName} · Room {summary.roomNumber} · {summary.checkInDate} → {summary.checkOutDate}</p>
            </div>
            <button className="modal-close" onClick={onClose}><X size={18} /></button>
          </div>
          <div className="modal-body">
            <div className="edit-room-info-row">
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">TOTAL AMOUNT</span>
                <span className="edit-room-info-value">{fmt(summary.totalAmount)}</span>
              </div>
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">AMOUNT PAID</span>
                <span className="edit-room-info-value">{fmt(summary.amountPaid)}</span>
              </div>
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">OUTSTANDING</span>
                <span className="edit-room-info-value">{fmt(summary.outstandingAmount)}</span>
              </div>
            </div>

            <div className="text-muted text-sm" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '.72rem', marginTop: '.5rem' }}>
              Transaction History
            </div>
            {loading ? (
              <div className="empty-state">Loading…</div>
            ) : payments.length === 0 ? (
              <div className="empty-state">No transactions recorded yet.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>METHOD</th>
                    <th>STATUS</th>
                    <th className="right">AMOUNT</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.paymentId}>
                      <td className="text-muted">{p.paidAt ? new Date(p.paidAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td>{p.paymentMethod || '—'}</td>
                      <td><span className={`badge ${p.status === 'Refunded' ? 'badge-red' : 'badge-green'}`}>{p.status}</span></td>
                      <td className="right" style={{ fontWeight: 700, color: p.status === 'Refunded' ? '#dc2626' : '#111827' }}>
                        {p.status === 'Refunded' ? '−' : ''}{fmt(p.amount)}
                      </td>
                      <td>
                        {p.status === 'Completed' && (
                          <button className="btn-link" onClick={() => setRefundTarget(p)}>Refund</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="modal-footer">
            <div className="modal-footer-left" />
            <div className="modal-footer-right">
              <button className="btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSaved={() => { load(); onChanged(); }}
        />
      )}
    </>
  );
}

/* ── Main Component ───────────────────────────────────────────── */
export default function Payments({ hideTopBar = false }) {
  const [hotels,   setHotels]   = useState([]);
  const [hotelId,  setHotelId]  = useState('');
  const [summaries, setSummaries] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search,   setSearch]   = useState('');
  const [collectTarget, setCollectTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);

  useEffect(() => {
    hotelService.getAll().then(h => {
      setHotels(h);
      if (h.length === 1) setHotelId(String(h[0].hotelId));
      else if (h.length > 1) setHotelId('all');
    }).catch(() => {});
  }, []);

  const load = () => {
    if (!hotelId) { setSummaries([]); return; }
    setLoading(true);
    paymentService.getOverview(hotelId === 'all' ? undefined : Number(hotelId))
      .then(data => { setSummaries(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [hotelId]);

  const stats = useMemo(() => {
    const totalCollected = summaries.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = summaries.reduce((s, r) => s + r.outstandingAmount, 0);
    const totalRefunded = summaries.reduce((s, r) => s + r.amountRefunded, 0);
    const pendingCount = summaries.filter(r => r.paymentStatus === 'Pending' || r.paymentStatus === 'Partial').length;
    return { totalCollected, totalOutstanding, totalRefunded, pendingCount };
  }, [summaries]);

  const filtered = useMemo(() => {
    let list = summaries;
    if (statusFilter !== 'All') list = list.filter(r => r.paymentStatus === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(r => r.guestName.toLowerCase().includes(q) || r.roomNumber.toLowerCase().includes(q));
    }
    return list;
  }, [summaries, statusFilter, search]);

  return (
    <>
      {!hideTopBar && <TopBar title="Payments" subtitle="Guest payments, refunds & transaction history" />}

      <div className="page-content">
        {hotels.length > 1 && (
          <select className="rx-select" style={{ maxWidth: 280, marginBottom: '1rem' }}
            value={hotelId} onChange={e => setHotelId(e.target.value)}>
            <option value="all">All Hotels</option>
            {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
          </select>
        )}

        <div className="stats-grid">
          <StatsCard icon={DollarSign}    label="TOTAL COLLECTED"   value={fmt(stats.totalCollected)} sub="Net of refunds" />
          <StatsCard icon={Clock}         label="PENDING PAYMENTS"  value={stats.pendingCount} sub="Reservations with a balance due" />
          <StatsCard icon={AlertTriangle} label="OUTSTANDING AMOUNT" value={fmt(stats.totalOutstanding)} sub="Yet to be collected" />
          <StatsCard icon={Undo2}         label="REFUNDS ISSUED"    value={fmt(stats.totalRefunded)} sub="Total refunded to guests" />
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Guest Payments</h3>
              <p className="card-sub">Reservation-wise payment status</p>
            </div>
            <div className="card-actions">
              <input
                className="search-box"
                style={{ border: '1px solid var(--border)', padding: '.4rem .7rem', borderRadius: 8 }}
                placeholder="Search guest or room…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {['All', 'Pending', 'Partial', 'Completed'].map(s => (
                <button
                  key={s}
                  className={`btn-ghost btn-sm${statusFilter === s ? ' active' : ''}`}
                  style={statusFilter === s ? { background: 'var(--primary)', color: '#fff' } : {}}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>GUEST / ROOM</th>
                {hotelId === 'all' && <th>HOTEL</th>}
                <th>STAY PERIOD</th>
                <th className="right">TOTAL</th>
                <th className="right">PAID</th>
                <th className="right">OUTSTANDING</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {!hotelId ? (
                <tr><td colSpan={8} className="empty-state">Select a hotel to view payments.</td></tr>
              ) : loading ? (
                <tr><td colSpan={8} className="empty-state">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-state">No reservations match this filter.</td></tr>
              ) : filtered.map(r => (
                <tr key={r.reservationId}>
                  <td>
                    <div className="fw-600">{r.guestName}</div>
                    <div className="text-muted text-sm">Room {r.roomNumber} · {r.roomTypeName}</div>
                  </td>
                  {hotelId === 'all' && <td className="text-muted">{r.hotelName ?? '—'}</td>}
                  <td className="text-muted">{r.checkInDate} → {r.checkOutDate}</td>
                  <td className="right">{fmt(r.totalAmount)}</td>
                  <td className="right" style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(r.amountPaid)}</td>
                  <td className="right" style={{ color: r.outstandingAmount > 0 ? '#dc2626' : '#9ca3af', fontWeight: 600 }}>
                    {fmt(r.outstandingAmount)}
                  </td>
                  <td><span className={`badge ${PAY_STATUS_BADGE[r.paymentStatus] ?? 'badge-gray'}`}>{r.paymentStatus}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '.5rem' }}>
                      {r.outstandingAmount > 0 && (
                        <button className="btn-link" onClick={() => setCollectTarget(r)}>Collect</button>
                      )}
                      <button className="btn-link" onClick={() => setHistoryTarget(r)}>History</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {collectTarget && (
        <CollectPaymentModal
          summary={collectTarget}
          onClose={() => setCollectTarget(null)}
          onSaved={load}
        />
      )}

      {historyTarget && (
        <HistoryModal
          summary={historyTarget}
          hotelId={hotelId === 'all' ? historyTarget.hotelId : Number(hotelId)}
          onClose={() => setHistoryTarget(null)}
          onChanged={load}
        />
      )}
    </>
  );
}
