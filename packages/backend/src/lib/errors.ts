import type { FastifyReply } from "fastify";
import type { ApiError } from "@transport-planner/shared";

export function sendError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  details?: unknown
): void {
  const body: ApiError = { success: false, error: message, details };
  void reply.status(statusCode).send(body);
}

export function sendNotFound(reply: FastifyReply, resource = "Resource"): void {
  sendError(reply, 404, `${resource} niet gevonden`);
}

export function sendUnauthorized(reply: FastifyReply): void {
  sendError(reply, 401, "Niet geautoriseerd");
}

export function sendForbidden(reply: FastifyReply): void {
  sendError(reply, 403, "Toegang geweigerd");
}
