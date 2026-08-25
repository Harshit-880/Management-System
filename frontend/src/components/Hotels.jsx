import { useState, useEffect, useMemo } from 'react';
import { Building2, CheckCircle2, XCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopBar from './TopBar';
import StatsCard from './StatsCard';
import HotelDirectory from './HotelDirectory';
import AddPropertyModal from './AddPropertyModal';
import { hotelService } from '../services/hotelService';
import { roomService } from '../services/roomService';
import { reservationService } from '../services/reservationService';

const TODAY = new Date().toISOString().slice(0, 10);

/* ── Hotel performance detail panel ──────────────────────────── */
function PerformanceModal({ hotel, onClose }) {
  const [rooms,        setRooms]        = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([
      roomService.getRooms(hotel.hotelId),
      reservationService.getAll({ hotelId: hotel.hotelId }),
    ]).then(([r, res]) => {
      setRooms(r);
      setReservations(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [hotel.hotelId]);

  const occupied  = rooms.filter(r => r.status === 'Occupied').length;
  const occupancy = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const revenueToday = reservations
    .filter(r => r.checkOutDate === TODAY && r.status === 'CheckedOut')
    .reduce((s, r) => s + (r.totalAmount || 0), 0);
  const checkInsToday  = reservations.filter(r => r.checkInDate === TODAY && r.status !== 'Cancelled').length;
  const checkOutsToday = reservations.filter(r => r.checkOutDate === TODAY && r.status !== 'Cancelled').length;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{hotel.hotelName}</h2>
            <p className="modal-sub">Performance overview</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="empty-state">Loading…</div>
          ) : (
            <>
              <div className="stats-grid" style={{ marginTop: 0 }}>
                <StatsCard icon={Building2} label="TOTAL ROOMS" value={rooms.length || '—'} sub={`${occupied} occupied`} />
                <StatsCard icon={CheckCircle2} label="OCCUPANCY" value={`${occupancy}%`} sub={`${occupied} of ${rooms.length}`} />
                <StatsCard icon={CheckCircle2} label="CHECK-INS TODAY" value={checkInsToday} sub="Scheduled arrivals" />
                <StatsCard icon={XCircle} label="CHECK-OUTS TODAY" value={checkOutsToday} sub="Scheduled departures" />
              </div>
              <div className="text-muted" style={{ marginTop: '1rem' }}>
                Today's revenue from completed check-outs: <strong>₹{revenueToday.toLocaleString('en-IN')}</strong>
              </div>
              <div className="text-muted" style={{ marginTop: '.5rem' }}>
                Total reservations on record: <strong>{reservations.length}</strong>
              </div>
            </>
          )}
          <div className="modal-footer">
            <div className="modal-footer-left" />
            <div className="modal-footer-right">
              <button type="button" className="btn-ghost" onClick={onClose}>Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export default function Hotels() {
  const navigate = useNavigate();
  const [hotels,   setHotels]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [editingHotel,   setEditingHotel]   = useState(null);
  const [performanceHotel, setPerformanceHotel] = useState(null);

  const load = () => {
    setLoading(true);
    hotelService.getAll({ includeInactive: true })
      .then(setHotels)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const stats = useMemo(() => ({
    total:    hotels.length,
    active:   hotels.filter(h => h.isActive).length,
    inactive: hotels.filter(h => !h.isActive).length,
  }), [hotels]);

  const handleHotelCreated = (newHotel) => setHotels(prev => [...prev, newHotel]);
  const handleHotelUpdated = (updated)  => setHotels(prev => prev.map(h => h.hotelId === updated.hotelId ? updated : h));
  const handleHotelActivated = (updated) => setHotels(prev => prev.map(h => h.hotelId === updated.hotelId ? updated : h));
  const handleHotelDeleted = (id) => setHotels(prev => prev.map(h => h.hotelId === id ? { ...h, isActive: false } : h));

  const openEdit = (hotel) => setEditingHotel(hotel);
  const closeEdit = () => setEditingHotel(null);

  return (
    <>
      <TopBar
        title="Hotels"
        subtitle="Manage all properties you own"
        actionLabel="Add Hotel"
        onAction={() => setShowModal(true)}
      />
      <div className="page-content">
        <div className="stats-grid">
          <StatsCard icon={Building2}    label="TOTAL HOTELS"    value={stats.total || '—'}    sub={loading ? 'Loading…' : `${stats.total} ${stats.total === 1 ? 'property' : 'properties'}`} />
          <StatsCard icon={CheckCircle2} label="ACTIVE HOTELS"   value={stats.active || '—'}   sub="Currently operating" />
          <StatsCard icon={XCircle}      label="INACTIVE HOTELS" value={stats.inactive || '—'} sub="Deactivated properties" />
        </div>

        <HotelDirectory
          hotels={hotels}
          onEdit={openEdit}
          onManageStaff={() => navigate('/staff')}
        />

        {hotels.length > 0 && (
          <div className="card" style={{ marginTop: '1.25rem', padding: '1rem 1.25rem' }}>
            <div style={{ fontWeight: 700, fontSize: '.9rem', marginBottom: '.75rem' }}>View Hotel Performance</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
              {hotels.filter(h => h.isActive).map(h => (
                <button key={h.hotelId} className="btn-ghost btn-sm" onClick={() => setPerformanceHotel(h)}>
                  {h.hotelName}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddPropertyModal
          onClose={() => setShowModal(false)}
          onCreated={handleHotelCreated}
        />
      )}

      {editingHotel && (
        <AddPropertyModal
          hotel={editingHotel}
          onClose={closeEdit}
          onUpdated={handleHotelUpdated}
          onDeleted={handleHotelDeleted}
          onActivated={handleHotelActivated}
        />
      )}

      {performanceHotel && (
        <PerformanceModal hotel={performanceHotel} onClose={() => setPerformanceHotel(null)} />
      )}
    </>
  );
}
