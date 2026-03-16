import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import socket from './Socket';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      try {
        const decoded = jwtDecode(storedToken);
        setUser({ id: decoded.id, role: decoded.role });
        // Connect socket and join personal room
        connectSocket(decoded.id);
      } catch {
        setUser(null);
      }
    }
  }, []);

  const connectSocket = (userId) => {
    if (!socket.connected) {
      socket.connect();
    }
    // Join personal room so this user receives real-time events
    socket.emit('join_user', userId);
  };

  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
    const decoded = jwtDecode(token);
    setUser({ id: decoded.id, role: decoded.role });
    connectSocket(decoded.id);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Disconnect socket on logout
    socket.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}