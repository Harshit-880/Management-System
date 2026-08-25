import { useState, useMemo, useEffect } from 'react';
import { X, BedDouble, Zap, Plus, Tag } from 'lucide-react';
import { roomService } from '../services/roomService';
import { hotelService } from '../services/hotelService';

const SINGLE_EMPTY = { roomNumber: '', roomTypeId: '', floor: '1', price: '' };
const BULK_EMPTY   = { roomTypeId: '', floorNumber: '2', prefix: '', startFrom: '1', count: '12' };
const TYPE_EMPTY   = { name: '', basePrice: '', capacity: '2', description: '' };

export default function AddInventoryModal({ onClose, onSaved }) {
  const [tab,       setTab]      = useState('types');
  const [single,    setSingle]   = useState(SINGLE_EMPTY);
  const [bulk,      setBulk]     = useState(BULK_EMPTY);
  const [newType,   setNewType]  = useState(TYPE_EMPTY);
  const [hotels,    setHotels]   = useState([]);
  const [hotelId,   setHotelId]  = useState('');
  const [roomTypes, setRoomTypes]= useState([]);
  const [error,     setError]    = useState('');
  const [loading,   setLoading]  = useState(false);

  useEffect(() => {
    hotelService.getAll()
      .then(h => { setHotels(h); if (h.length === 1) setHotelId(String(h[0].hotelId)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!hotelId) { setRoomTypes([]); return; }
    roomService.getRoomTypes(Number(hotelId)).then(setRoomTypes).catch(() => {});
  }, [hotelId]);

  const bulkPreview = useMemo(() => {
    const floor = parseInt(bulk.floorNumber) || 0;
    const start = parseInt(bulk.startFrom)   || 1;
    const count = parseInt(bulk.count)       || 0;
    if (!floor || count <= 0) return null;
    const nums = Array.from({ length: count }, (_, i) => {
      const seq = String(start + i).padStart(2, '0');
      return bulk.prefix ? `${bulk.prefix}${start + i}` : `${floor}${seq}`;
    });
    if (nums.length <= 3) return nums.join(', ');
    return `${nums[0]}, ${nums[1]}, … ${nums[nums.length - 1]}`;
  }, [bulk]);

  const handleCreateType = async () => {
    if (!hotelId)           { setError('Select a hotel first.');    return; }
    if (!newType.name)      { setError('Type name is required.');   return; }
    if (!newType.basePrice) { setError('Base price is required.');  return; }
    if (!newType.capacity)  { setError('Capacity is required.');    return; }
    setError(''); setLoading(true);
    try {
      const created = await roomService.createRoomType({
        hotelId:     Number(hotelId),
        name:        newType.name,
        basePrice:   Number(newType.basePrice),
        capacity:    Number(newType.capacity),
        description: newType.description || null,
      });
      setRoomTypes(prev => [...prev, created]);
      setNewType(TYPE_EMPTY);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSingle = async () => {
    if (!hotelId)           { setError('Select a hotel first.');    return; }
    if (!single.roomNumber) { setError('Room Number is required.'); return; }
    if (!single.roomTypeId) { setError('Room Type is required.');   return; }
    setError(''); setLoading(true);
    try {
      const room = await roomService.createRoom({
        hotelId:    Number(hotelId),
        roomTypeId: Number(single.roomTypeId),
        roomNumber: single.roomNumber,
        price:      single.price ? Number(single.price) : null,
        floor:      `Floor ${single.floor}`,
      });
      onSaved?.([room]);
      setSingle(SINGLE_EMPTY);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleBulk = async () => {
    const floor = parseInt(bulk.floorNumber);
    const count = parseInt(bulk.count);
    if (!hotelId)            { setError('Select a hotel first.');           return; }
    if (!bulk.roomTypeId)    { setError('Room Type is required.');          return; }
    if (!floor || count < 1) { setError('Floor and Count are required.');   return; }
    setError(''); setLoading(true);
    try {
      const result = await roomService.bulkCreate({
        hotelId:     Number(hotelId),
        roomTypeId:  Number(bulk.roomTypeId),
        floorNumber: floor,
        prefix:      bulk.prefix,
        startFrom:   parseInt(bulk.startFrom) || 1,
        count,
      });
      if (result.created?.length) onSaved?.(result.created);
      if (result.skippedDuplicates?.length)
        setError(`Created ${result.created.length} rooms. Skipped duplicates: ${result.skippedDuplicates.join(', ')}`);
      else setBulk(BULK_EMPTY);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const selectedType = (id) => roomTypes.find(t => String(t.roomTypeId) === String(id));
  const hotelName = hotels.find(h => String(h.hotelId) === hotelId)?.hotelName ?? 'your hotel';
  const switchTab = (t) => { setTab(t); setError(''); };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal inv-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Add New Inventory</h2>
            <p className="modal-sub">Managing inventory for <strong>{hotelName}</strong>.</p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Hotel selector */}
        {hotels.length > 1 && (
          <div className="modal-field" style={{ padding: '0 1.5rem .5rem' }}>
            <label>HOTEL <span style={{ color: 'var(--primary)' }}>*</span></label>
            <select value={hotelId} onChange={e => { setHotelId(e.target.value); setError(''); }}>
              <option value="">— Select hotel —</option>
              {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>)}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="inv-tabs">
          <button className={`inv-tab${tab === 'types'  ? ' active' : ''}`} onClick={() => switchTab('types')}>
            <Tag size={13} /> Room Types
            {roomTypes.length > 0 && <span className="inv-tab-badge">{roomTypes.length}</span>}
          </button>
          <button className={`inv-tab${tab === 'single' ? ' active' : ''}`} onClick={() => switchTab('single')}>
            <BedDouble size={13} /> Individual
          </button>
          <button className={`inv-tab${tab === 'bulk'   ? ' active' : ''}`} onClick={() => switchTab('bulk')}>
            <Zap size={13} /> Bulk Generator
          </button>
        </div>

        {error && <div className="error-msg" style={{ margin: '0 1.5rem .5rem' }}>{error}</div>}

        {/* ── Tab: Room Types ── */}
        {tab === 'types' && (
          <div className="inv-tab-body">
            {roomTypes.length > 0 && (
              <div className="inv-types-table">
                <div className="inv-types-header">
                  <span>NAME</span><span>BASE PRICE</span><span>CAPACITY</span><span>DESCRIPTION</span>
                </div>
                {roomTypes.map(t => (
                  <div key={t.roomTypeId} className="inv-types-row">
                    <span className="inv-type-name">{t.name}</span>
                    <span>₹{t.basePrice.toLocaleString()}</span>
                    <span>{t.capacity} guests</span>
                    <span className="text-muted">{t.description || '—'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="inv-create-type">
              <div className="inv-section-heading">
                <Plus size={14} /> New Room Type
              </div>

              <div className="modal-field-row">
                <div className="modal-field" style={{ flex: 2 }}>
                  <label>TYPE NAME <span style={{ color: 'var(--primary)' }}>*</span></label>
                  <input placeholder="e.g. Deluxe Suite" value={newType.name}
                    onChange={e => setNewType(n => ({ ...n, name: e.target.value }))} />
                </div>
                <div className="modal-field">
                  <label>CAPACITY <span style={{ color: 'var(--primary)' }}>*</span></label>
                  <input type="number" min="1" placeholder="2" value={newType.capacity}
                    onChange={e => setNewType(n => ({ ...n, capacity: e.target.value }))} />
                </div>
              </div>

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>BASE PRICE (₹) <span style={{ color: 'var(--primary)' }}>*</span></label>
                  <div className="input-prefix-wrap">
                    <span className="input-prefix">₹</span>
                    <input type="number" min="0" placeholder="5000" value={newType.basePrice}
                      onChange={e => setNewType(n => ({ ...n, basePrice: e.target.value }))}
                      style={{ paddingLeft: '1.8rem' }} />
                  </div>
                </div>
                <div className="modal-field" style={{ flex: 2 }}>
                  <label>DESCRIPTION</label>
                  <input placeholder="Optional" value={newType.description}
                    onChange={e => setNewType(n => ({ ...n, description: e.target.value }))} />
                </div>
              </div>

              <button className="inv-btn-save" disabled={loading || !hotelId} onClick={handleCreateType}>
                {loading ? 'Creating…' : '+ Create Room Type'}
              </button>
            </div>
          </div>
        )}

        {/* ── Tab: Individual Room ── */}
        {tab === 'single' && (
          <div className="inv-tab-body">
            <div className="modal-field">
              <label>ROOM NUMBER <span style={{ color: 'var(--primary)' }}>*</span></label>
              <input placeholder="e.g. 101" value={single.roomNumber}
                onChange={e => setSingle(s => ({ ...s, roomNumber: e.target.value }))} />
            </div>

            <div className="modal-field">
              <label>ROOM TYPE <span style={{ color: 'var(--primary)' }}>*</span></label>
              <select value={single.roomTypeId}
                onChange={e => setSingle(s => ({ ...s, roomTypeId: e.target.value }))}>
                <option value="">— Select type —</option>
                {roomTypes.map(t => (
                  <option key={t.roomTypeId} value={t.roomTypeId}>
                    {t.name} — ₹{t.basePrice.toLocaleString()} · {t.capacity} guests
                  </option>
                ))}
              </select>
              {roomTypes.length === 0 && hotelId && (
                <p className="inv-no-types">
                  No room types yet —{' '}
                  <button className="link-btn" onClick={() => switchTab('types')}>create one first</button>.
                </p>
              )}
            </div>

            <div className="modal-field-row">
              <div className="modal-field">
                <label>FLOOR</label>
                <input type="number" min="1" value={single.floor}
                  onChange={e => setSingle(s => ({ ...s, floor: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>CUSTOM PRICE (OPTIONAL)</label>
                <div className="input-prefix-wrap">
                  <span className="input-prefix">₹</span>
                  <input type="number" placeholder={selectedType(single.roomTypeId)?.basePrice ?? ''}
                    value={single.price}
                    onChange={e => setSingle(s => ({ ...s, price: e.target.value }))}
                    style={{ paddingLeft: '1.8rem' }} />
                </div>
                {single.roomTypeId && !single.price && (
                  <p className="text-muted text-sm" style={{ marginTop: '.25rem' }}>
                    Defaults to base: ₹{selectedType(single.roomTypeId)?.basePrice?.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <button className="inv-btn-save" disabled={loading} onClick={handleSingle}>
              {loading ? 'Saving…' : 'Save Single Room'}
            </button>
          </div>
        )}

        {/* ── Tab: Bulk Generator ── */}
        {tab === 'bulk' && (
          <div className="inv-tab-body">
            <p className="inv-bulk-desc">Perfect for adding entire floors at once. StaySync auto-sequences room numbers.</p>

            <div className="modal-field">
              <label>TARGET ROOM TYPE <span style={{ color: 'var(--primary)' }}>*</span></label>
              <select value={bulk.roomTypeId}
                onChange={e => setBulk(b => ({ ...b, roomTypeId: e.target.value }))}>
                <option value="">— Select type —</option>
                {roomTypes.map(t => (
                  <option key={t.roomTypeId} value={t.roomTypeId}>
                    {t.name} — ₹{t.basePrice.toLocaleString()} base
                  </option>
                ))}
              </select>
              {roomTypes.length === 0 && hotelId && (
                <p className="inv-no-types">
                  No room types yet —{' '}
                  <button className="link-btn" onClick={() => switchTab('types')}>create one first</button>.
                </p>
              )}
            </div>

            <div className="modal-field-row">
              <div className="modal-field">
                <label>FLOOR NUMBER <span style={{ color: 'var(--primary)' }}>*</span></label>
                <input type="number" min="1" value={bulk.floorNumber}
                  onChange={e => setBulk(b => ({ ...b, floorNumber: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>ROOM PREFIX</label>
                <input placeholder="e.g. 20" value={bulk.prefix}
                  onChange={e => setBulk(b => ({ ...b, prefix: e.target.value }))} />
              </div>
            </div>

            <div className="modal-field-row">
              <div className="modal-field">
                <label>STARTING FROM</label>
                <input type="number" min="1" value={bulk.startFrom}
                  onChange={e => setBulk(b => ({ ...b, startFrom: e.target.value }))} />
              </div>
              <div className="modal-field">
                <label>COUNT</label>
                <input type="number" min="1" value={bulk.count}
                  onChange={e => setBulk(b => ({ ...b, count: e.target.value }))} />
              </div>
            </div>

            {bulkPreview && (
              <div className="inv-preview">
                <span className="inv-preview-label">PREVIEW</span>
                This will create rooms: <strong>{bulkPreview}</strong>
              </div>
            )}

            <button className="inv-btn-bulk" disabled={loading} onClick={handleBulk}>
              {loading ? 'Generating…' : `Generate ${bulk.count || 0} Rooms`}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="inv-modal-footer">
          <span className="inv-footer-note">ℹ Rooms are marked "Available" by default.</span>
          <div className="modal-footer-right">
            <button className="btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
