// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = "ADMIN" | "PLANNER";

export type OrderStatus = "PENDING" | "ASSIGNED" | "LOCKED" | "SENT_TO_SAP";

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  createdAt: string;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  code: string;
  capacityKarren: number;
  isLocked: boolean;
  plannedDate: string | null;
  driverId: string | null;
  driver: Driver | null;
  orders: Order[];
  usedKarren: number;
  availableKarren: number;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  sapOrderId: string;
  customerId: string;
  customerName: string;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  requestedDeliveryAt: string | null;
  volumeKarren: number;
  status: OrderStatus;
  notes: string | null;
  vehicleId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API response wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  sub: string;    // user id
  email: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── Socket.io events ─────────────────────────────────────────────────────────

/**
 * Events emitted by the server to clients.
 * Keeping these typed in shared/ ensures frontend and backend stay in sync.
 */
export interface ServerToClientEvents {
  "order:created": (order: Order) => void;
  "order:updated": (order: Order) => void;
  "order:deleted": (orderId: string) => void;
  "vehicle:updated": (vehicle: Vehicle) => void;
  "driver:updated": (driver: Driver) => void;
}

/**
 * Events emitted by clients to the server.
 */
export interface ClientToServerEvents {
  // Reserved for future use (e.g., joining a planning session room)
  "session:join": (date: string) => void;
}
