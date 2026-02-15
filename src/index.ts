import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from "@hono/node-server/serve-static";
import dotenv from "dotenv";

// Import existing routes
import users from "./routes/users";
import pelayanLevel from "./routes/pelayanLevel";
import pelayanPosition from "./routes/pelayananPosition";
import ibadahCategory from "./routes/ibadahCategory";
import krw from "./routes/krw";
import ibadah from "./routes/ibadah";
import ibadahAssignments from "./routes/ibadahAssignment";
import adminUsers from "./routes/adminUsers";
import authRoutes from "./routes/auth";
import publicApi from "./routes/public";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";
import { authenticateToken } from "./middleware/authMiddleware";

// Import services
import { AuthService } from "./services/authService";
import type { AppEnv } from "./types/hono";

dotenv.config();

const app = new OpenAPIHono<AppEnv>();

// Global middleware
app.use(
  "*",
  logger(),
  secureHeaders(),
  requestLogger,
  rateLimiter,
  cors({
    origin: (origin) => {
      const allowed = process.env.ALLOWED_ORIGINS?.split(",") ?? [
        "http://localhost:3001",
        "http://localhost:3000",
      ];
      if (!origin) return "http://localhost:3001";
      return allowed.includes(origin) ? origin : "null";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Statics
app.use("/*", serveStatic({ root: "./public" }));

// Create default admin user on startup
AuthService.createDefaultAdmin();

// Health check endpoint
app.get("/health", (c) => {
  return c.json({
    success: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Register Security Component for OpenAPI
app.openAPIRegistry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  bearerFormat: "JWT",
});

// ============================================
// PUBLIC ROUTES (NO AUTHENTICATION REQUIRED)
// ============================================
// Mount public routes FIRST before protected routes
app.route("/api/public", publicApi);
app.route("/api/auth", authRoutes);

// ============================================
// PROTECTED ROUTES (AUTHENTICATION REQUIRED)
// ============================================
const protectedRoutes = new OpenAPIHono<AppEnv>();
protectedRoutes.use("*", authenticateToken);

// Register Protected API routes
protectedRoutes.route("/users", users);
protectedRoutes.route("/pelayan-level", pelayanLevel);
protectedRoutes.route("/pelayan-positions", pelayanPosition);
protectedRoutes.route("/ibadah-categories", ibadahCategory);
protectedRoutes.route("/krw", krw);
protectedRoutes.route("/ibadah", ibadah);
protectedRoutes.route("/ibadah-assignments", ibadahAssignments);
protectedRoutes.route("/admin-users", adminUsers);

// Mount protected routes under /api
app.route("/api", protectedRoutes);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    message: "Pelayanan Scheduler API",
    version: "1.0.0",
    documentation: "/docs",
    openapi: "/swagger-json",
  });
});

// OpenAPI documentation configuration
app.doc("/swagger-json", {
  openapi: "3.0.0",
  info: {
    title: "GKJWPRO Pelayanan API",
    version: "1.0.0",
    description: "API for managing church service schedules and assignments",
  },
  servers: [
    {
      url: process.env.API_URL || "/",
      description: "API server",
    },
  ],
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/swagger-json" }));

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: "Endpoint not found" }, 404);
});

// Error handler
app.onError(errorHandler);

const port = parseInt(process.env.PORT || "3000");

if (require.main === module) {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
  console.log(`📋 OpenAPI Spec: http://localhost:${port}/swagger-json`);
}

export default {
  fetch: app.fetch,
  port,
};
