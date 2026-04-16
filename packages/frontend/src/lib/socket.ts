import { io, type Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@transport-planner/shared";

const WS_URL = import.meta.env["VITE_WS_URL"] ?? "";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Gedeelde Socket.io instantie — gebruik dit in je stores of hooks.
 */
export const socket: AppSocket = io(WS_URL, {
  autoConnect: false,
  withCredentials: true,
});
