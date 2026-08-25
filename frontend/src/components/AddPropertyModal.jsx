import { useState } from 'react';
import { X } from 'lucide-react';
import { hotelService } from '../services/hotelService';

const EMPTY = {
  hotelName: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  currency: 'USD',
  timeZone: '',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  policies: '',
};

// Pass `hotel` prop to open in edit mode, omit it for create mode.
export default function AddPropertyModal({ onClose, onCreated, onUpdated, onDeleted, onActivated, hotel }) {
  const isEdit = !!hotel;
  const [form, setForm] = useState(
    isEdit
      ? {
          hotelName: hotel.hotelName ?? '',
          address:   hotel.address   ?? '',
          city:      hotel.city      ?? '',
          country:   hotel.country   ?? '',
          phone:     hotel.phone     ?? '',
          email:     hotel.email     ?? '',
          currency:  hotel.currency  ?? 'USD',
          timeZone:  hotel.timeZone  ?? '',
          checkInTime:  hotel.checkInTime  ?? '14:00',
          checkOutTime: hotel.checkOutTime ?? '11:00',
          policies:     hotel.policies     ?? '',
        }
      : EMPTY
  );
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [activating, setActivating] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        const updated = await hotelService.update(hotel.hotelId, form);
        onUpdated?.(updated);
      } else {
        const created = await hotelService.create(form);
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Permanently remove "${hotel.hotelName}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await hotelService.remove(hotel.hotelId);
      onDeleted?.(hotel.hotelId);
      onClose();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const updated = await hotelService.activate(hotel.hotelId);
      onActivated?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
      setActivating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h2>
            <p className="modal-sub">
              {isEdit
                ? `Updating details for ${hotel.hotelName}`
                : 'Fill in the hotel details to register it in the system.'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-msg">{error}</div>}

          <div className="modal-field-row">
            <div className="modal-field">
              <label>Hotel Name <span className="required">*</span></label>
              <input
                name="hotelName"
                value={form.hotelName}
                onChange={handleChange}
                placeholder="e.g. Grand Palace"
                required
              />
            </div>
            <div className="modal-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="hotel@example.com"
              />
            </div>
          </div>

          <div className="modal-field">
            <label>Address</label>
            <input
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="123 Main Street"
            />
          </div>

          <div className="modal-field-row">
            <div className="modal-field">
              <label>City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="New York"
              />
            </div>
            <div className="modal-field">
              <label>Country</label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="United States"
              />
            </div>
          </div>

          <div className="modal-field-row">
            <div className="modal-field">
              <label>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div className="modal-field">
              <label>Currency</label>
              <select name="currency" value={form.currency} onChange={handleChange}>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
                <option value="AED">AED — UAE Dirham</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>
          </div>

          <div className="modal-field">
            <label>Time Zone</label>
            <select name="timeZone" value={form.timeZone} onChange={handleChange}>
              <option value="">— Select time zone —</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="America/Chicago">America/Chicago (CST)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </div>

          <div className="modal-field-row">
            <div className="modal-field">
              <label>Check-In Time</label>
              <input type="time" name="checkInTime" value={form.checkInTime} onChange={handleChange} />
            </div>
            <div className="modal-field">
              <label>Check-Out Time</label>
              <input type="time" name="checkOutTime" value={form.checkOutTime} onChange={handleChange} />
            </div>
          </div>

          <div className="modal-field">
            <label>Hotel Policies</label>
            <textarea
              name="policies"
              value={form.policies}
              onChange={handleChange}
              rows={3}
              placeholder="e.g. No smoking, pets allowed on request, cancellation within 24 hours…"
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '.6rem .75rem', fontSize: '.85rem', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>

          {/* Footer */}
          <div className="modal-footer">
            <div className="modal-footer-left">
              {isEdit && (
                <>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleDelete}
                    disabled={deleting || loading || activating}
                  >
                    {deleting ? 'Deleting…' : 'Delete Property'}
                  </button>
                  {!hotel.isActive && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={handleActivate}
                      disabled={activating || loading || deleting}
                    >
                      {activating ? 'Activating…' : 'Reactivate Property'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer-right">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={loading || deleting}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={loading || deleting}>
                {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Property')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
