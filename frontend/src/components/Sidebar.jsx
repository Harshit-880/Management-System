import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShieldCheck,
  LogOut,
  CalendarCheck,
  BedDouble,
  Clipboard,
  BellRing,
  DoorOpen,
  DollarSign,
  Sparkles,
} from 'lucide-react';

// Admin (Super Admin / Owner) nav
const ADMIN_NAV = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/hotels',           icon: Building2,        label: 'Hotels' },
  { to: '/reservations',     icon: CalendarCheck,    label: 'Reservations' },
  { to: '/guests',           icon: Clipboard,        label: 'Guests' },
  { to: '/admin/rooms',      icon: BedDouble,        label: 'Rooms' },
  { to: '/staff',            icon: Users,            label: 'Staff' },
  { to: '/housekeeping-admin', icon: Sparkles,       label: 'Housekeeping' },
  { to: '/payments-billing', icon: DollarSign,       label: 'Payments & Billing' },
];

// Manager nav
const MANAGER_NAV = [
  { to: '/manager',              icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/manager/reservations', icon: CalendarCheck,   label: 'Reservations' },
  { to: '/manager/rooms',        icon: BedDouble,       label: 'Room Inventory' },
  { to: '/manager/staff',        icon: Users,           label: 'Staff Management' },
  { to: '/manager/housekeeping', icon: Sparkles,        label: 'Housekeeping' },
  { to: '/manager/guests',       icon: Clipboard,       label: 'Guests' },
  { to: '/manager/payments',     icon: DollarSign,      label: 'Payments' },
  { to: '/manager/settings',     icon: ShieldCheck,     label: 'Property Settings' },
];

// Receptionist nav
const RECEPTION_NAV = [
  { to: '/reception',          icon: CalendarCheck, label: 'Reservations' },
  { to: '/reception/rooms',    icon: BedDouble,     label: 'Room Status' },
  { to: '/reception/guests',   icon: Clipboard,     label: 'Guest Directory' },
  { to: '/reception/service',  icon: BellRing,      label: 'Service Requests' },
  { to: '/reception/billing',  icon: DoorOpen,      label: 'Billing' },
];

// Housekeeping nav
const HOUSEKEEPING_NAV = [
  { to: '/housekeeping',         icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/housekeeping/rooms',   icon: BedDouble,       label: 'Rooms' },
  { to: '/housekeeping/tasks',   icon: Clipboard,       label: 'Cleaning Tasks' },
  { to: '/housekeeping/service', icon: BellRing,        label: 'Service Requests' },
];

// Accountant nav
const ACCOUNTANT_NAV = [
  { to: '/reception/billing',  icon: DoorOpen,   label: 'Billing' },
  { to: '/reception/payments', icon: DollarSign, label: 'Payments' },
  { to: '/reception/guests',   icon: Clipboard,  label: 'Guest Directory' },
];

// Staff (generic) nav
const STAFF_NAV = [
  { to: '/reception/service', icon: BellRing, label: 'Service Requests' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const userRole = user?.roles?.[0] ?? '';
  let nav;
  if      (userRole === 'Receptionist') nav = RECEPTION_NAV;
  else if (userRole === 'Manager')      nav = MANAGER_NAV;
  else if (userRole === 'Housekeeping') nav = HOUSEKEEPING_NAV;
  else if (userRole === 'Accountant')   nav = ACCOUNTANT_NAV;
  else if (userRole === 'Staff')        nav = STAFF_NAV;
  else                                   nav = ADMIN_NAV;  // Admin + unknown

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">H</div>
        <div className="brand-text">
          <span className="brand-name">Hesperia Group</span>
          <span className="brand-sub">Global Hotels, Portfolio E</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="user-meta">
          <span className="user-name">{user?.firstName} {user?.lastName}</span>
          <span className="user-role">{user?.roles?.[0] ?? 'Staff'}</span>
        </div>
        <button className="btn-icon-logout" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
