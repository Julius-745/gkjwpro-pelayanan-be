import { Hono } from "hono";
import db from "../db";

const users = new Hono();

users.get("/", (c) => {
  const stmt = db.prepare("SELECT * FROM users");
  const data = stmt.all();
  return c.json(data);
});

users.post("/", async (c) => {
  const body = await c.req.json();
  const { name, email } = body;

  const stmt = db.prepare("INSERT INTO users (name, email) VALUES (?, ?)");
  const info = stmt.run(name, email);

  return c.json({ id: Number(info.lastInsertRowid), name, email }, 201);
});

users.get("/:id", (c) => {
  const id = c.req.param("id");
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const user = stmt.get(id);

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json(user);
});

export default users;
