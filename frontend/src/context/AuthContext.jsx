import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// En dev → proxy CRA vers localhost:5000 (baseURL = '/api')
// En prod → URL complète du backend Render via variable d'environnement
const API_BASE = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api';

const API = axios.create({ baseURL: API_BASE });

API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('padel_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('padel_token');
    const userData = localStorage.getItem('padel_user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });
    localStorage.setItem('padel_token', data.token);
    localStorage.setItem('padel_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const register = async (email, password, name) => {
    const { data } = await API.post('/auth/register', { email, password, name });
    localStorage.setItem('padel_token', data.token);
    localStorage.setItem('padel_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('padel_token');
    localStorage.removeItem('padel_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, API }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export { API };
