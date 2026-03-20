import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/companies/me`, { withCredentials: true });
      setCompany(res.data);
    } catch {
      setCompany(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/companies/login`, { email, password }, { withCredentials: true });
    setCompany(res.data);
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/companies/register`, data, { withCredentials: true });
    setCompany(res.data);
    return res.data;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/companies/logout`, {}, { withCredentials: true });
    } catch { /* ignore */ }
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ company, user: company, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
