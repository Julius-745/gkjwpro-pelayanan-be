// routes/pelayanLevel.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";

const pelayanLevel = new Hono();

const createLevelSchema = z.object({
  levelName: z.string().min(1, "Level name is required")
});

pelayanLevel.get("/", (c) => {
  try {
    const stmt = db.prepare("SELECT * FROM pelayanLevel ORDER BY createdAt DESC");
    const data = stmt.all();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch pelayan levels" }, 500);
  }
});

pelayanLevel.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid level ID" }, 400);
    }

    const stmt = db.prepare("SELECT * FROM pelayanLevel WHERE id = ?");
    const level = stmt.get(id);

    if (!level) {
      return c.json({ success: false, error: "Pelayan level not found" }, 404);
    }

    return c.json({ success: true, data: level });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch pelayan level" }, 500);
  }
});

pelayanLevel.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createLevelSchema.parse(body);

    const stmt = db.prepare("INSERT INTO pelayanLevel (levelName) VALUES (?)");
    const info = stmt.run(validatedData.levelName);

    const newLevel = db.prepare("SELECT * FROM pelayanLevel WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newLevel }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Level name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to create pelayan level" }, 500);
  }
});

pelayanLevel.patch("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid level ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = createLevelSchema.parse(body);

    const stmt = db.prepare("UPDATE pelayanLevel SET levelName = ? WHERE id = ?");
    const info = stmt.run(validatedData.levelName, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Pelayan level not found" }, 404);
    }

    const updatedLevel = db.prepare("SELECT * FROM pelayanLevel WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedLevel });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Level name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to update pelayan level" }, 500);
  }
});

pelayanLevel.delete("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid level ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM pelayanLevel WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Pelayan level not found" }, 404);
    }

    return c.json({ success: true, message: "Pelayan level deleted successfully" });
  } catch (error) {
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return c.json({ success: false, error: "Cannot delete level that is referenced by users" }, 400);
    }
    return c.json({ success: false, error: "Failed to delete pelayan level" }, 500);
  }
});

export default pelayanLevel;