// src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { serveStatic } from '@hono/node-server/serve-static';
import fs from "fs";
import dotenv from "dotenv";

// Import existing routes
import users from "./routes/users";
import pelayanLevel from "./routes/pelayanLevel";
import pelayanPosition from "./routes/pelayananPosition";
import ibadahCategory from "./routes/ibadahCategory";
import krw from "./routes/krw";
import ibadah from "./routes/ibadah";
import ibadahAssignments from "./routes/ibadahAssignment";

// Import new auth routes
import authRoutes from "./routes/auth";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";
import { authenticateToken } from "./middleware/authMiddleware";

// Import services
import { AuthService } from "./services/authService";
import adminUsers from "./routes/adminUsers";


dotenv.config();

const app = new Hono();

app.use('/swagger.json', serveStatic({ path: './swagger.json' }));
app.use('/*', serveStatic({ root: './public' }));

// Global middleware
app.use("*", logger(), secureHeaders(), requestLogger, rateLimiter,
cors({
    origin: (origin) => {
      const allowed = (process.env.ALLOWED_ORIGINS?.split(',') ?? ["http://localhost:3001"]);
      if (!origin) return "http://localhost:3001"; // fallback for server-side calls
      return allowed.includes(origin) ? origin : "null";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Create default admin user on startup
AuthService.createDefaultAdmin();

// Serve OpenAPI JSON
app.get("/swagger.json", (c) => {
  const spec = fs.readFileSync("./src/swagger.json", "utf8");
  return c.text(spec, 200, { "Content-Type": "application/json" });
});

// Swagger UI HTML page
app.get("/docs", (c) => {
 const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>GKJWPRO Pelayanan API</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            SwaggerUIBundle({
              url: '/swagger.json',
              dom_id: '#swagger-ui'
            });
          };
        </script>
      </body>
    </html>
  `;
  return c.html(html);
});

// Health check endpoint
app.get("/health", (c) => {
  return c.json({ 
    success: true,
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0"
  });
});

// Auth routes (public)
app.route("/api/auth", authRoutes);

// Protected API routes
app.route("/api/users", users.use("*", authenticateToken));
app.route("/api/pelayan-level", pelayanLevel.use("*", authenticateToken));
app.route("/api/pelayan-positions", pelayanPosition.use("*", authenticateToken));
app.route("/api/ibadah-categories", ibadahCategory.use("*", authenticateToken));
app.route("/api/krw", krw.use("*", authenticateToken));
app.route("/api/ibadah", ibadah.use("*", authenticateToken));
app.route("/api/ibadah-assignments", ibadahAssignments.use("*", authenticateToken));
app.route("/api/admin-users", adminUsers.use("*", authenticateToken));

// Root endpoint with API information
app.get("/", (c) => {
  return c.json({
    message: "Pelayanan Scheduler API",
    version: "1.0.0",
    documentation: "/docs",
    openapi: "./swagger.json",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      users: "/api/users",
      pelayanLevels: "/api/pelayan-level",
      pelayanPositions: "/api/pelayan-positions",
      ibadahCategories: "/api/ibadah-categories",
      krw: "/api/krw",
      ibadah: "/api/ibadah",
      ibadahAssignments: "/api/ibadah-assignments"
    }
  } as const);
});

// API information endpoint
app.get("/api", (c) => {
  return c.json({
    message: "Pelayanan Scheduler API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      users: "/api/users",
      pelayanLevels: "/api/pelayan-level",
      pelayanPositions: "/api/pelayan-positions",
      ibadahCategories: "/api/ibadah-categories",
      krw: "/api/krw",
      ibadah: "/api/ibadah",
      ibadahAssignments: "/api/ibadah-assignments"
    },
    documentation: "/docs"
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: "Endpoint not found" }, 404);
});

// Error handler
app.onError(errorHandler);

const port = parseInt(process.env.PORT || "3000");

console.log(`🚀 Server is running on port ${port}`);
console.log(`📚 API Documentation: http://localhost:${port}/docs`);
console.log(`📋 OpenAPI Spec: http://localhost:${port}/swagger.json`);

export default {
  fetch: app.fetch,
  port,
};
