// src/index.ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { compress } from "hono/compress";
import { serveStatic } from '@hono/node-server/serve-static';
import { readFileSync } from 'fs';
import { join } from 'path';
import fs from "fs";
import dotenv from "dotenv";

// Import routes
import users from "./routes/users";
import pelayanLevel from "./routes/pelayanLevel";
import pelayanPosition from "./routes/pelayananPosition";
import ibadahCategory from "./routes/ibadahCategory";
import krw from "./routes/krw";
import ibadah from "./routes/ibadah";

// Import middleware
import { errorHandler } from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import { rateLimiter } from "./middleware/rateLimiter";

dotenv.config();

const app = new Hono();

app.use('/swagger.json', serveStatic({ path: './swagger.json' }));

// Global middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use("*", compress());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Custom middleware
app.use("*", requestLogger);
app.use("*", rateLimiter);

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
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
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
    status: "ok", 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0"
  });
});

// API routes
app.route("/api/users", users);
app.route("/api/pelayan-levels", pelayanLevel);
app.route("/api/pelayan-positions", pelayanPosition);
app.route("/api/ibadah-categories", ibadahCategory);
app.route("/api/krw", krw);
app.route("/api/ibadah", ibadah);

// Root endpoint with API information
app.get("/", (c) => {
  return c.json({
    message: "Pelayanan Scheduler API",
    version: "1.0.0",
    documentation: "/docs",
    openapi: "./swagger.json",
    endpoints: {
      health: "/health",
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
console.log(`📋 OpenAPI Spec: http://localhost:${port}/openapi.json`);

serve({
  fetch: app.fetch,
  port,
});

export default app;