/**
 * SocketContext
 *
 * - Connects / disconnects the shared socket when auth state changes.
 * - Joins the logged-in user's private room (user:<id>) for notifications.
 * - Exposes `socket` via useSocket() hook.
 */

import { createContext, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext";
import socket from "../socket/socket";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?._id) {
      // Open the connection
      if (!socket.connected) {
        socket.connect();
      }

      // Join the user's private notification room
      socket.emit("join-user", user._id);

      socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        socket.emit("join-user", user._id);
      });

      socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket connection error:", err.message);
      });
    } else {
      // User logged out — close the socket cleanly
      if (socket.connected) {
        socket.disconnect();
      }
    }

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
    };
  }, [isAuthenticated, user?._id]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

/** Returns the shared socket instance. */
export function useSocket() {
  return useContext(SocketContext);
}
