"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
var hono_1 = require("hono");
var node_server_1 = require("@hono/node-server");
var cors_1 = require("hono/cors");
var logger_1 = require("hono/logger");
var secure_headers_1 = require("hono/secure-headers");
var compress_1 = require("hono/compress");
var serve_static_1 = require("@hono/node-server/serve-static");
var fs_1 = require("fs");
var dotenv_1 = require("dotenv");
// Import routes
var users_1 = require("./routes/users");
var pelayanLevel_1 = require("./routes/pelayanLevel");
var pelayananPosition_1 = require("./routes/pelayananPosition");
var ibadahCategory_1 = require("./routes/ibadahCategory");
var krw_1 = require("./routes/krw");
var ibadah_1 = require("./routes/ibadah");
// Import middleware
var errorHandler_1 = require("./middleware/errorHandler");
var requestLogger_1 = require("./middleware/requestLogger");
var rateLimiter_1 = require("./middleware/rateLimiter");
dotenv_1.default.config();
var app = new hono_1.Hono();
app.use('/swagger.json', (0, serve_static_1.serveStatic)({ path: './swagger.json' }));
// Global middleware
app.use("*", (0, logger_1.logger)());
app.use("*", (0, secure_headers_1.secureHeaders)());
app.use("*", (0, compress_1.compress)());
app.use("*", (0, cors_1.cors)({
    origin: process.env.CORS_ORIGIN || "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
}));
// Custom middleware
app.use("*", requestLogger_1.requestLogger);
app.use("*", rateLimiter_1.rateLimiter);
// Serve OpenAPI JSON
app.get("/swagger.json", function (c) {
    var spec = fs_1.default.readFileSync("./src/swagger.json", "utf8");
    return c.text(spec, 200, { "Content-Type": "application/json" });
});
// Swagger UI HTML page
app.get("/docs", function (c) {
    var html = "\n    <!DOCTYPE html>\n    <html>\n      <head>\n        <title>Swagger UI</title>\n        <link rel=\"stylesheet\" href=\"https://unpkg.com/swagger-ui-dist/swagger-ui.css\" />\n      </head>\n      <body>\n        <div id=\"swagger-ui\"></div>\n        <script src=\"https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js\"></script>\n        <script>\n          window.onload = function() {\n            SwaggerUIBundle({\n              url: '/swagger.json',\n              dom_id: '#swagger-ui'\n            });\n          };\n        </script>\n      </body>\n    </html>\n  ";
    return c.html(html);
});
// Health check endpoint
app.get("/health", function (c) {
    return c.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0"
    });
});
// API routes
app.route("/api/users", users_1.default);
app.route("/api/pelayan-levels", pelayanLevel_1.default);
app.route("/api/pelayan-positions", pelayananPosition_1.default);
app.route("/api/ibadah-categories", ibadahCategory_1.default);
app.route("/api/krw", krw_1.default);
app.route("/api/ibadah", ibadah_1.default);
// Root endpoint with API information
app.get("/", function (c) {
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
    });
});
// API information endpoint
app.get("/api", function (c) {
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
app.notFound(function (c) {
    return c.json({ success: false, error: "Endpoint not found" }, 404);
});
// Error handler
app.onError(errorHandler_1.errorHandler);
var port = parseInt(process.env.PORT || "3000");
console.log("\uD83D\uDE80 Server is running on port ".concat(port));
console.log("\uD83D\uDCDA API Documentation: http://localhost:".concat(port, "/docs"));
console.log("\uD83D\uDCCB OpenAPI Spec: http://localhost:".concat(port, "/openapi.json"));
(0, node_server_1.serve)({
    fetch: app.fetch,
    port: port,
});
exports.default = app;
