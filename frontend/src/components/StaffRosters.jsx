import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import TopBar from './TopBar';
import StatsCard from './StatsCard';
import AddStaffModal from './AddStaffModal';
import { staffService } from '../services/staffService';
import { hotelService } from '../services/hotelService';
import { Users, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';

const DEPARTMENTS = ['All Departments', 'Reception', 'Housekeeping', 'Management', 'Accounting', 'Staff'];

const AVATAR_COLORS = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777'];

function Avatar({ name, index }) {
  const initials = `${name?.firstName?.[0] ?? ''}${name?.lastName?.[0] ?? ''}`.toUpperCase();
  return (
    <div className="staff-avatar" style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}>
      {initials}
    </div>
  );
}

export default function StaffRosters() {
  const [staff,        setStaff]        = useState([]);
  const [hotels,       setHotels]       = useState([]);
  const [hotelFilter,  setHotelFilter]  = useState('all');
  const [search,       setSearch]       = useState('');
  const [activeDept,   setActiveDept]   = useState('All Departments');
  const [showModal,    setShowModal]    = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  useEffect(() => {
    staffService.getAll().then(setStaff).catch(() => {});
    hotelService.getAll().then(setHotels).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchHotel =
        hotelFilter === 'all' || String(s.hotelId) === hotelFilter;
      const matchDept =
        activeDept === 'All Departments' ||
        s.roleName.toLowerCase().includes(activeDept.toLowerCase());
      const matchSearch =
        !search ||
        `${s.firstName} ${s.lastName} ${s.email} ${s.hotelName}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchHotel && matchDept && matchSearch;
    });
  }, [staff, hotelFilter, activeDept, search]);

  const activeCount  = staff.filter((s) => s.isActive).length;
  const mgmtCount    = staff.filter((s) => s.roleName === 'Manager' && s.isActive).length;

  const handleCreated   = (s) => setStaff((p) => [...p, s]);
  const handleUpdated   = (u) => setStaff((p) => p.map((s) => s.hotelStaffId === u.hotelStaffId ? u : s));
  const handleDeactivated = (id) => setStaff((p) => p.map((s) => s.hotelStaffId === id ? { ...s, isActive: false } : s));

  return (
    <>
      <TopBar
        title="Staff Rosters & Roles"
        actionLabel="Add Staff Member"
        onAction={() => setShowModal(true)}
      />

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ marginTop: '1.25rem' }}>
          <StatsCard icon={Users}      label="ACTIVE STAFF"   value={activeCount || '—'} sub={activeCount ? `Across all properties` : 'No staff yet'} />
          <StatsCard icon={Briefcase}  label="MANAGEMENT"     value={mgmtCount || '—'}   sub="Senior level roles" />
          <StatsCard icon={TrendingUp} label="RETENTION"      value="99.2%"               subHighlight="+1.2%" sub=" this year" />
          <StatsCard icon={AlertCircle} label="OPEN ROLES"    value="—"                   sub="No open roles tracked" />
        </div>

        {/* Table card */}
        <div className="card">
          {/* Department tabs + search */}
          <div className="staff-toolbar">
            <div className="dept-tabs">
              {DEPARTMENTS.map((d) => (
                <button
                  key={d}
                  className={`dept-tab${activeDept === d ? ' active' : ''}`}
                  onClick={() => setActiveDept(d)}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="staff-toolbar-right">
              {hotels.length > 1 && (
                <select
                  className="rx-select"
                  style={{ marginBottom: 0, maxWidth: 200 }}
                  value={hotelFilter}
                  onChange={(e) => setHotelFilter(e.target.value)}
                >
                  <option value="all">All Hotels</option>
                  {hotels.map((h) => <option key={h.hotelId} value={String(h.hotelId)}>{h.hotelName}</option>)}
                </select>
              )}
              <div className="search-box">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search staff…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className="btn-ghost btn-sm">Export List</button>
            </div>
          </div>

          {/* Table */}
          <table className="data-table">
            <thead>
              <tr>
                <th>STAFF MEMBER</th>
                <th>ROLE</th>
                <th>PROPERTY</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    {staff.length === 0
                      ? 'No staff members yet. Add your first staff member.'
                      : 'No staff match this filter.'}
                  </td>
                </tr>
              ) : (
                filtered.map((s, i) => (
                  <tr key={s.hotelStaffId}>
                    <td>
                      <div className="staff-member-cell">
                        <Avatar name={s} index={i} />
                        <div>
                          <div className="fw-600">{s.firstName} {s.lastName}</div>
                          <div className="text-muted text-sm">{s.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{s.roleName}</td>
                    <td className="staff-hotel">{s.hotelName}</td>
                    <td>
                      <span className={`badge ${s.isActive ? 'badge-green' : 'badge-yellow'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-link" onClick={() => setEditingStaff(s)}>
                        View / Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <AddStaffModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {editingStaff && (
        <AddStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onUpdated={handleUpdated}
          onDeactivated={handleDeactivated}
        />
      )}
    </>
  );
}
