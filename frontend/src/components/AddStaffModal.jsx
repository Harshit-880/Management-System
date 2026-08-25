import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { staffService } from '../services/staffService';
import { hotelService } from '../services/hotelService';
import { useAuth } from '../context/AuthContext';

const EMPTY = {
  firstName: '', lastName: '', email: '',
  password: '', phone: '', hotelId: '', roleId: '',
};

// Roles a Manager is not allowed to assign to anyone — only Admins can
// create/promote someone into these tiers.
const MANAGER_RESTRICTED_ROLES = ['Manager', 'Admin'];

// Pass `staff` prop for edit mode (profile + role/status update), omit for create.
export default function AddStaffModal({ onClose, onCreated, onUpdated, onDeactivated, staff }) {
  const { user } = useAuth();
  const isManagerUser = user?.roles?.[0] === 'Manager';

  const isEdit = !!staff;
  const [form, setForm] = useState(
    isEdit
      ? {
          firstName: staff.firstName,
          lastName:  staff.lastName,
          phone:     staff.phone ?? '',
          roleId:    staff.roleId,
          isActive:  staff.isActive,
        }
      : EMPTY
  );
  const [hotels, setHotels]       = useState([]);
  const [roles,  setRoles]        = useState([]);
  const [error,  setError]        = useState('');
  const [loading, setLoading]     = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    Promise.all([hotelService.getAll(), staffService.getRoles()])
      .then(([h, r]) => {
        setHotels(h);
        setRoles(isManagerUser ? r.filter(role => !MANAGER_RESTRICTED_ROLES.includes(role.roleName)) : r);
      })
      .catch(() => {});
  }, []);

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [e.target.name]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isEdit) {
        const updated = await staffService.update(staff.hotelStaffId, {
          roleId: Number(form.roleId),
          isActive: form.isActive,
          firstName: form.firstName,
          lastName:  form.lastName,
          phone:     form.phone || null,
        });
        onUpdated?.(updated);
      } else {
        const created = await staffService.create({
          ...form,
          hotelId: Number(form.hotelId),
          roleId:  Number(form.roleId),
        });
        onCreated?.(created);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate ${staff.firstName} ${staff.lastName}? They will lose login access.`)) return;
    setDeactivating(true);
    try {
      await staffService.deactivate(staff.hotelStaffId);
      onDeactivated?.(staff.hotelStaffId);
      onClose();
    } catch (err) {
      setError(err.message);
      setDeactivating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">
              {isEdit ? `${staff.firstName} ${staff.lastName}` : 'Add Staff Member'}
            </h2>
            <p className="modal-sub">
              {isEdit
                ? 'View and update staff details, role, and status'
                : 'Creates a login account and assigns them to a hotel'}
            </p>
          </div>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-msg">{error}</div>}

          {isEdit && (
            <div className="edit-room-info-row" style={{ marginBottom: '.25rem' }}>
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">EMAIL</span>
                <span className="edit-room-info-value" style={{ fontSize: '.85rem' }}>{staff.email}</span>
              </div>
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">HOTEL</span>
                <span className="edit-room-info-value" style={{ fontSize: '.85rem' }}>{staff.hotelName}</span>
              </div>
              <div className="edit-room-info-item">
                <span className="edit-room-info-label">JOINED</span>
                <span className="edit-room-info-value" style={{ fontSize: '.85rem' }}>
                  {new Date(staff.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          {isEdit && (
            <>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>First Name <span className="required">*</span></label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} required />
                </div>
                <div className="modal-field">
                  <label>Last Name <span className="required">*</span></label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} required />
                </div>
              </div>
              <div className="modal-field">
                <label>Phone</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
              </div>
            </>
          )}

          {!isEdit && (
            <>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>First Name <span className="required">*</span></label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="Sarah" required />
                </div>
                <div className="modal-field">
                  <label>Last Name <span className="required">*</span></label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Miller" required />
                </div>
              </div>
              <div className="modal-field-row">
                <div className="modal-field">
                  <label>Email <span className="required">*</span></label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="sarah@hotel.com" required />
                </div>
                <div className="modal-field">
                  <label>Phone</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 234 567 8900" />
                </div>
              </div>
              <div className="modal-field">
                <label>Password <span className="required">*</span></label>
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min. 6 characters" required minLength={6} />
              </div>
              <div className="modal-field">
                <label>Assign to Hotel <span className="required">*</span></label>
                <select name="hotelId" value={form.hotelId} onChange={handleChange} required>
                  <option value="">— Select hotel —</option>
                  {hotels.map((h) => (
                    <option key={h.hotelId} value={h.hotelId}>{h.hotelName}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="modal-field">
            <label>Role <span className="required">*</span></label>
            <select name="roleId" value={form.roleId} onChange={handleChange} required>
              <option value="">— Select role —</option>
              {roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>{r.roleName}</option>
              ))}
            </select>
            {isManagerUser && (
              <p className="text-muted text-sm" style={{ marginTop: '.25rem' }}>
                Managers cannot assign the Manager or Admin role.
              </p>
            )}
          </div>

          {isEdit && (
            <div className="modal-field">
              <label className="checkbox-label">
                <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
                &nbsp; Active (uncheck to suspend login access)
              </label>
            </div>
          )}

          <div className="modal-footer">
            <div className="modal-footer-left">
              {isEdit && (
                <button type="button" className="btn-danger" onClick={handleDeactivate} disabled={deactivating || loading}>
                  {deactivating ? 'Deactivating…' : 'Deactivate'}
                </button>
              )}
            </div>
            <div className="modal-footer-right">
              <button type="button" className="btn-ghost" onClick={onClose} disabled={loading || deactivating}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading || deactivating}>
                {loading ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Add Staff Member')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
