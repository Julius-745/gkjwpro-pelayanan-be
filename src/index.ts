import { Hono } from "hono";
import { serve } from "@hono/node-server";
import users from "./routes/users";
import fs from "fs";

const app = new Hono();

// Serve Swagger UI HTML
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
              url: '/openapi.json',
              dom_id: '#swagger-ui'
            });
          };
        </script>
      </body>
    </html>
  `;
  return c.html(html);
});

// Serve static openapi.json
app.get("/openapi.json", (c) => {
  const spec = fs.readFileSync("./src/openapi.json", "utf8");
  return c.text(spec, 200, { "Content-Type": "application/json" });
});

app.route("/users", users);

app.get("/", (c) => c.text("Hono + SQLite + Swagger UI"));

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server running at http://localhost:${info.port}`);
    console.log(`Swagger docs at http://localhost:${info.port}/docs`);
  }
);
