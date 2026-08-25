import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Hotels from './components/Hotels';
import PaymentsBilling from './components/PaymentsBilling';
import StaffRosters from './components/StaffRosters';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ManagerHousekeeping from './components/ManagerHousekeeping';
import RoomInventory from './components/RoomInventory';
import RoomStatus from './components/RoomStatus/RoomStatus';
import ServiceRequests from './components/ServiceRequests/ServiceRequests';
import Billing from './components/Billing/Billing';
import Payments from './components/Payments/Payments';
import GuestPortal from './components/GuestPortal/GuestPortal';
import HousekeepingDashboard from './components/Housekeeping/HousekeepingDashboard';
import HousekeepingRoomStatus from './components/Housekeeping/HousekeepingRoomStatus';
import HousekeepingServiceRequests from './components/Housekeeping/HousekeepingServiceRequests';
import CleaningTasks from './components/Housekeeping/CleaningTasks';
import GuestDirectory from './components/GuestDirectory/GuestDirectory';
import Sidebar from './components/Sidebar';
import './App.css';

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-area">{children}</main>
    </div>
  );
}

// Redirects Receptionists away from /dashboard to /reception
function RoleBasedDashboard() {
  const { user } = useAuth();
  const role = user?.roles?.[0];
  if (role === 'Receptionist') return <Navigate to="/reception"          replace />;
  if (role === 'Manager')      return <Navigate to="/manager"             replace />;
  if (role === 'Housekeeping') return <Navigate to="/housekeeping"        replace />;
  if (role === 'Accountant')   return <Navigate to="/reception/billing"  replace />;
  if (role === 'Staff')        return <Navigate to="/reception/service"  replace />;
  return <AppLayout><Dashboard /></AppLayout>;  // Admin
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Public guest portal — no auth required */}
          <Route path="/guest/:token" element={<GuestPortal />} />
          <Route path="/dashboard" element={<PrivateRoute><RoleBasedDashboard /></PrivateRoute>} />
          {/* Manager routes */}
          <Route path="/manager"              element={<PrivateRoute><AppLayout><ManagerDashboard /></AppLayout></PrivateRoute>} />
          <Route path="/manager/reservations" element={<PrivateRoute><AppLayout><ReceptionistDashboard /></AppLayout></PrivateRoute>} />
          <Route path="/manager/rooms"  element={<PrivateRoute><AppLayout><RoomInventory /></AppLayout></PrivateRoute>} />
          <Route path="/manager/housekeeping" element={<PrivateRoute><AppLayout><ManagerHousekeeping /></AppLayout></PrivateRoute>} />
          <Route path="/manager/guests" element={<PrivateRoute><AppLayout><GuestDirectory /></AppLayout></PrivateRoute>} />
          <Route path="/manager/payments" element={<PrivateRoute><AppLayout><Payments /></AppLayout></PrivateRoute>} />
          <Route path="/manager/staff"  element={<PrivateRoute><AppLayout><StaffRosters /></AppLayout></PrivateRoute>} />
          <Route path="/manager/*"      element={<PrivateRoute><AppLayout><ManagerDashboard /></AppLayout></PrivateRoute>} />
          {/* Housekeeping routes */}
          <Route path="/housekeeping"          element={<PrivateRoute><AppLayout><HousekeepingDashboard /></AppLayout></PrivateRoute>} />
          <Route path="/housekeeping/rooms"    element={<PrivateRoute><AppLayout><HousekeepingRoomStatus /></AppLayout></PrivateRoute>} />
          <Route path="/housekeeping/tasks"    element={<PrivateRoute><AppLayout><CleaningTasks /></AppLayout></PrivateRoute>} />
          <Route path="/housekeeping/service"  element={<PrivateRoute><AppLayout><HousekeepingServiceRequests /></AppLayout></PrivateRoute>} />
          {/* Receptionist routes */}
          <Route path="/reception"          element={<PrivateRoute><AppLayout><ReceptionistDashboard /></AppLayout></PrivateRoute>} />
          <Route path="/reception/rooms"    element={<PrivateRoute><AppLayout><RoomStatus /></AppLayout></PrivateRoute>} />
          <Route path="/reception/service"  element={<PrivateRoute><AppLayout><ServiceRequests /></AppLayout></PrivateRoute>} />
          <Route path="/reception/billing"  element={<PrivateRoute><AppLayout><Billing /></AppLayout></PrivateRoute>} />
          <Route path="/reception/payments" element={<PrivateRoute><AppLayout><Payments /></AppLayout></PrivateRoute>} />
          <Route path="/reception/guests"   element={<PrivateRoute><AppLayout><GuestDirectory /></AppLayout></PrivateRoute>} />
          <Route path="/reception/*"        element={<PrivateRoute><AppLayout><ReceptionistDashboard /></AppLayout></PrivateRoute>} />
          {/* Admin/Owner routes */}
          <Route path="/hotels"           element={<PrivateRoute><AppLayout><Hotels /></AppLayout></PrivateRoute>} />
          <Route path="/reservations"     element={<PrivateRoute><AppLayout><ReceptionistDashboard /></AppLayout></PrivateRoute>} />
          <Route path="/guests"           element={<PrivateRoute><AppLayout><GuestDirectory /></AppLayout></PrivateRoute>} />
          <Route path="/admin/rooms"      element={<PrivateRoute><AppLayout><RoomInventory /></AppLayout></PrivateRoute>} />
          <Route path="/staff"            element={<PrivateRoute><AppLayout><StaffRosters /></AppLayout></PrivateRoute>} />
          <Route path="/housekeeping-admin" element={<PrivateRoute><AppLayout><ManagerHousekeeping /></AppLayout></PrivateRoute>} />
          <Route path="/service-requests" element={<PrivateRoute><AppLayout><ServiceRequests /></AppLayout></PrivateRoute>} />
          <Route path="/payments-billing" element={<PrivateRoute><AppLayout><PaymentsBilling /></AppLayout></PrivateRoute>} />
          <Route path="/properties" element={<PrivateRoute><AppLayout><Hotels /></AppLayout></PrivateRoute>} />
          <Route path="/financial"  element={<PrivateRoute><AppLayout><div className="page-content"><h2 style={{padding:'2rem'}}>Financial Performance</h2></div></AppLayout></PrivateRoute>} />
          <Route path="/audit"      element={<PrivateRoute><AppLayout><div className="page-content"><h2 style={{padding:'2rem'}}>System Audit</h2></div></AppLayout></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
