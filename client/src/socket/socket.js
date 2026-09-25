/**
 * Client-side Socket.io singleton.
 *
 * Import `socket` wherever you need to emit / listen:
 *   import socket from '../socket/socket';
 *   socket.emit('join-project', projectId);
 *   socket.on('task:updated', handler);
 */

import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace("/api", "") ||
  "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: false,      // connect only after a user is authenticated
  withCredentials: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
});

export default socket;
