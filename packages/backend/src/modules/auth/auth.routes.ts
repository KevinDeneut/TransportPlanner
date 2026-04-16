import type { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { LoginSchema } from "@transport-planner/shared";
import type { LoginResponse, ApiSuccess } from "@transport-planner/shared";
import { prisma } from "../../lib/prisma.js";
import { sendError, sendUnauthorized } from "../../lib/errors.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/login
   * Geeft een JWT token terug bij geldige credentials.
   */
  app.post("/login", async (request, reply) => {
    const result = LoginSchema.safeParse(request.body);
    if (!result.success) {
      sendError(reply, 400, "Ongeldige invoer", result.error.flatten());
      return;
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      sendUnauthorized(reply);
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      sendUnauthorized(reply);
      return;
    }

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: process.env["JWT_EXPIRES_IN"] ?? "8h" }
    );

    const body: ApiSuccess<LoginResponse> = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      },
    };

    void reply.status(200).send(body);
  });

  /**
   * GET /api/auth/me
   * Geeft de ingelogde gebruiker terug (JWT vereist).
   */
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const user = await prisma.user.findUnique({
        where: { id: request.user.sub },
      });

      if (!user) {
        sendUnauthorized(reply);
        return;
      }

      const body: ApiSuccess<LoginResponse["user"]> = {
        success: true,
        data: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      };

      void reply.send(body);
    }
  );
}
