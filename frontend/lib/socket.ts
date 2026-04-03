import { io, Socket } from 'socket.io-client';

// Hardcoded for reliability — same as api.ts
const BASE_URL = 'https://astrochat-api.onrender.com';

let socket: Socket | null = null;

export const getSocket = (token: string): Socket => {
  if (!socket) {
    socket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};
