import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Single shared socket instance across the app
const socket = io(BASE_URL, {
  autoConnect: false, // We connect manually when entering a project
});

export default socket;