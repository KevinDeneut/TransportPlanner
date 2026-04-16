import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import fastifySocketIO from "fastify-socket.io";
import type { Server as SocketIOServer } from "socket.io";
import type { AuthTokenPayload } from "@transport-planner/shared";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { vehiclesRoutes } from "./modules/vehicles/vehicles.routes.js";
import { driversRoutes } from "./modules/drivers/drivers.routes.js";
import { sapRoutes } from "./modules/sap/sap.routes.js";

// Voeg authenticate en io decorators toe aan FastifyInstance type
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ) => Promise<void>;
    io: SocketIOServer;
  }
}

// Voeg user payload toe aan FastifyRequest type
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthTokenPayload;
    user: AuthTokenPayload;
  }
}

export function buildApp() {
  const isDev = process.env["NODE_ENV"] !== "production";

  const app = Fastify({
    logger: isDev
      ? {
          level: "info",
          transport: { target: "pino-pretty", options: { colorize: true } },
        }
      : { level: "warn" },
  });

  // ─── Plugins ──────────────────────────────────────────────────────────────

  void app.register(cors, {
    origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    credentials: true,
  });

  void app.register(jwt, {
    secret: process.env["JWT_SECRET"] ?? "dev-secret-change-in-production",
  });

  // fastify-socket.io v5 has incomplete type definitions — double cast is intentional
  void app.register(fastifySocketIO as unknown as Parameters<typeof app.register>[0], {
    cors: {
      origin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
      credentials: true,
    },
  });

  // ─── Auth decorator ───────────────────────────────────────────────────────

  app.decorate("authenticate", async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      void reply.status(401).send({ success: false, error: "Niet geautoriseerd" });
    }
  });

  // ─── Routes ───────────────────────────────────────────────────────────────

  void app.register(authRoutes, { prefix: "/api/auth" });
  void app.register(ordersRoutes, { prefix: "/api/orders" });
  void app.register(vehiclesRoutes, { prefix: "/api/vehicles" });
  void app.register(driversRoutes, { prefix: "/api/drivers" });
  void app.register(sapRoutes, { prefix: "/api/sap" });

  // ─── Health check ─────────────────────────────────────────────────────────

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return app;
}
