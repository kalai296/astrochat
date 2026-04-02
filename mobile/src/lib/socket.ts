import { io, Socket } from 'socket.io-client';

// Hardcoded backend URL
const BASE_URL = 'https://astrochat-api.onrender.com';
export { BASE_URL };

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token },
      // websocket only — avoids XMLHttpRequest/window.location issues in RN
      transports: ['websocket'],
      upgrade: false,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 20000,
      autoConnect: true,
      // Explicitly set path
      path: '/socket.io/',
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
