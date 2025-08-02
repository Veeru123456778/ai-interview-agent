// lib/socketClient.js
import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io("http://localhost:4000", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}
