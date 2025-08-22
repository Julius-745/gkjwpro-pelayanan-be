// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { compress } from "hono/compress";
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

// Import new auth routes
import authRoutes from "./routes/auth";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";
import { authenticateToken } from "./middleware/authMiddleware";

// Import services
import { AuthService } from "./services/authService";


dotenv.config();

const app = new Hono();

app.use('/swagger.json', serveStatic({ path: './swagger.json' }));

// Global middleware
app.use("*", logger(), secureHeaders(), compress(), requestLogger, rateLimiter, compress() ,cors({
  origin: process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS?.split(',') || ["http://localhost:3000"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

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
        <title>Swagger UI</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
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
app.route("/api/pelayan-levels", pelayanLevel.use("*", authenticateToken));
app.route("/api/pelayan-positions", pelayanPosition.use("*", authenticateToken));
app.route("/api/ibadah-categories", ibadahCategory.use("*", authenticateToken));
app.route("/api/krw", krw.use("*", authenticateToken));
app.route("/api/ibadah", ibadah.use("*", authenticateToken));

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
      pelayanLevels: "/api/pelayan-levels",
      pelayanPositions: "/api/pelayan-positions",
      ibadahCategories: "/api/ibadah-categories",
      krw: "/api/krw",
      ibadah: "/api/ibadah"
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
      pelayanLevels: "/api/pelayan-levels",
      pelayanPositions: "/api/pelayan-positions",
      ibadahCategories: "/api/ibadah-categories",
      krw: "/api/krw",
      ibadah: "/api/ibadah"
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

serve({
  fetch: app.fetch,
  port,
});

export default app;