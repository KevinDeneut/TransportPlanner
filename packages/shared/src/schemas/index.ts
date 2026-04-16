import { z } from "zod";

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(1, "Wachtwoord is verplicht"),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email("Ongeldig e-mailadres"),
  password: z.string().min(8, "Wachtwoord moet minimaal 8 tekens bevatten"),
  displayName: z.string().min(1, "Naam is verplicht"),
  role: z.enum(["ADMIN", "PLANNER"]).default("PLANNER"),
});
export type CreateUserInput = z.infer<typeof CreateUserSchema>;

// ─── Order schemas ────────────────────────────────────────────────────────────

export const CreateOrderSchema = z.object({
  sapOrderId: z.string().min(1),
  customerId: z.string().min(1),
  customerName: z.string().min(1),
  deliveryAddress: z.string().min(1),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  requestedDeliveryAt: z.string().datetime().optional(),
  volumeKarren: z.number().int().positive(),
  notes: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

export const UpdateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  deliveryAddress: z.string().min(1).optional(),
  deliveryLat: z.number().optional(),
  deliveryLng: z.number().optional(),
  requestedDeliveryAt: z.string().datetime().optional().nullable(),
  volumeKarren: z.number().int().positive().optional(),
  notes: z.string().optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
});
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;

// ─── Vehicle schemas ──────────────────────────────────────────────────────────

export const CreateVehicleSchema = z.object({
  code: z.string().min(1, "Code is verplicht"),
  capacityKarren: z.number().int().positive().default(40),
  plannedDate: z.string().datetime().optional(),
});
export type CreateVehicleInput = z.infer<typeof CreateVehicleSchema>;

export const UpdateVehicleSchema = z.object({
  driverId: z.string().uuid().optional().nullable(),
  isLocked: z.boolean().optional(),
  plannedDate: z.string().datetime().optional().nullable(),
});
export type UpdateVehicleInput = z.infer<typeof UpdateVehicleSchema>;

// ─── Driver schemas ───────────────────────────────────────────────────────────

export const CreateDriverSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  licenseNumber: z.string().min(1, "Rijbewijsnummer is verplicht"),
});
export type CreateDriverInput = z.infer<typeof CreateDriverSchema>;

export const UpdateDriverSchema = z.object({
  name: z.string().min(1).optional(),
  licenseNumber: z.string().min(1).optional(),
  isAvailable: z.boolean().optional(),
});
export type UpdateDriverInput = z.infer<typeof UpdateDriverSchema>;

// ─── SAP incoming webhook schema ──────────────────────────────────────────────

/**
 * This is deliberately loose — the SAP format is not yet finalized.
 * The SapAdapter will normalize this into a CreateOrderInput.
 */
export const SapWebhookSchema = z.object({}).passthrough();
export type SapWebhookPayload = z.infer<typeof SapWebhookSchema>;
