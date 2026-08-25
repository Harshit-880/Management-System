import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children }) {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    // Clear any stale/expired session data before bouncing to login.
    logout();
    return <Navigate to="/login" replace />;
  }

  return children;
}
