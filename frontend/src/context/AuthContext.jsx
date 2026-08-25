import { createContext, useContext, useState } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getUser());

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    authService.saveAuth(data);
    setUser(data);
    return data;
  };

  const register = async (credentials) => {
    const data = await authService.register(credentials);
    authService.saveAuth(data);
    setUser(data);
    return data;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // Authenticated only while we have a user AND the JWT hasn't expired yet.
  const isAuthenticated = !!user && authService.isAuthenticated();

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
