import { io } from 'socket.io-client';

// Single shared socket instance for the entire app
// This file is imported wherever real-time features are needed

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

const socket = io(SOCKET_URL, {
  autoConnect: false,    // Don't connect until user is logged in
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

export default socket;