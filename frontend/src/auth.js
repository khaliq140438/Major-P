import React, { createContext, useContext, useState, useEffect } from 'react';
import api from './api';
import socket from './Socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ping backend on startup to see if we have an active HttpOnly session cookie
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data && res.data.user) {
          setUser(res.data.user);
          connectSocket(res.data.user.id);
        }
      } catch (error) {
        // 401 Unauthorized means no active cookie, user is logged out
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const connectSocket = (userId) => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_user', userId);
  };

  const login = (userData) => {
    // The HttpOnly cookie is automatically handled by the browser
    // We just need to update React state
    setUser(userData);
    connectSocket(userData.id);
  };

  const logout = async () => {
    try {
      // Tell backend to clear the HttpOnly cookie
      await api.post('/auth/logout');
    } catch (error) {
      console.error("Logout error", error);
    }
    setUser(null);
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}