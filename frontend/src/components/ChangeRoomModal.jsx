import { useState, useEffect } from 'react';
import { roomService } from '../services/roomService';
import { reservationService } from '../services/reservationService';

// Shared "move guest to another room" modal — used by the Receptionist /
// Manager Reservations screen and the Manager Room Inventory screen.
export default function ChangeRoomModal({ reservation: r, onClose, onSaved }) {
  const [rooms,    setRooms]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    roomService.getAvailable(r.hotelId, r.checkInDate, r.checkOutDate)
      .then(list => setRooms(list.filter(rm => rm.roomId !== r.roomId)))
      .catch(() => setErr('Failed to load available rooms.'))
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!selected) return;
    setSaving(true); setErr('');
    try {
      const updated = await reservationService.changeRoom(r.reservationId, selected.roomId);
      onSaved(updated);
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const oldNightly = r.nights > 0 ? r.totalAmount / r.nights : 0;
  const newNightly = selected ? (selected.effectivePrice ?? 0) : 0;
  const priceDiff  = selected ? Math.round((newNightly - oldNightly) * r.nights) : 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.48)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100 }}
         onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:14, padding:'1.75rem', width:'100%', maxWidth:560,
                    maxHeight:'82vh', display:'flex', flexDirection:'column',
                    boxShadow:'0 24px 64px rgba(0,0,0,.22)' }}
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ marginBottom:'1.1rem', flexShrink:0 }}>
          <h3 style={{ margin:0, fontSize:'1.05rem', fontWeight:700, color:'#111827' }}>Change Room</h3>
          <div style={{ fontSize:'.82rem', color:'#6b7280', marginTop:3 }}>
            {r.guestName} · Currently in <strong>Room {r.roomNumber}</strong> ({r.roomTypeName})
          </div>
        </div>

        {/* Room grid */}
        <div style={{ flex:1, overflowY:'auto', marginBottom:'.85rem' }}>
          {loading && <div style={{ color:'#6b7280', fontSize:'.88rem', padding:'1.5rem 0', textAlign:'center' }}>Loading available rooms…</div>}
          {!loading && err && <div style={{ color:'#dc2626', fontSize:'.82rem' }}>{err}</div>}
          {!loading && !err && rooms.length === 0 && (
            <div style={{ color:'#6b7280', fontSize:'.88rem', padding:'1.5rem 0', textAlign:'center' }}>No other rooms available for these dates.</div>
          )}
          {!loading && rooms.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(148px, 1fr))', gap:'.6rem' }}>
              {rooms.map(rm => {
                const isSel = selected?.roomId === rm.roomId;
                return (
                  <div key={rm.roomId} onClick={() => setSelected(rm)}
                    style={{
                      border: isSel ? '2px solid #4f46e5' : '1.5px solid #e5e7eb',
                      borderRadius:10, padding:'.75rem', cursor:'pointer',
                      background: isSel ? '#f5f3ff' : '#fafafa',
                    }}>
                    <div style={{ fontWeight:800, fontSize:'1.05rem', color:'#1e1b4b' }}>Room {rm.roomNumber}</div>
                    <div style={{ fontSize:'.73rem', color:'#6b7280', marginTop:'.15rem' }}>{rm.roomTypeName}</div>
                    <div style={{ fontSize:'.72rem', color:'#9ca3af' }}>{rm.floor}</div>
                    <div style={{ fontSize:'.82rem', fontWeight:700, color: isSel ? '#4f46e5' : '#374151', marginTop:'.35rem' }}>
                      ₹{rm.effectivePrice?.toLocaleString()}/night
                    </div>
                    {isSel && <div style={{ fontSize:'.7rem', color:'#4f46e5', fontWeight:700, marginTop:'.25rem' }}>✓ Selected</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Summary + actions */}
        <div style={{ flexShrink:0 }}>
          {selected && (
            <div style={{ background:'#f0f4ff', border:'1px solid #c7d2fe', borderRadius:9, padding:'.65rem .9rem', marginBottom:'.75rem', fontSize:'.83rem', color:'#374151' }}>
              Moving to <strong>Room {selected.roomNumber}</strong> ({selected.roomTypeName})
              {priceDiff !== 0 && (
                <span style={{ marginLeft:'.5rem', fontWeight:700, color: priceDiff > 0 ? '#dc2626' : '#16a34a' }}>
                  {priceDiff > 0 ? '+' : ''}₹{Math.abs(priceDiff).toLocaleString()} {priceDiff > 0 ? 'extra for stay' : 'saving'}
                </span>
              )}
              {priceDiff === 0 && <span style={{ color:'#6b7280' }}> · Same rate</span>}
            </div>
          )}
          {err && <div style={{ color:'#dc2626', fontSize:'.8rem', marginBottom:'.5rem' }}>{err}</div>}
          <div style={{ display:'flex', justifyContent:'flex-end', gap:'.65rem' }}>
            <button onClick={onClose}
              style={{ padding:'.5rem 1.2rem', background:'#f3f4f6', color:'#374151', border:'none', borderRadius:8, fontSize:'.88rem', fontWeight:600, cursor:'pointer' }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!selected || saving}
              style={{ padding:'.5rem 1.4rem', background: !selected || saving ? '#9ca3af' : '#4f46e5', color:'#fff', border:'none', borderRadius:8, fontSize:'.88rem', fontWeight:700, cursor: !selected || saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Changing…' : 'Confirm Change'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
