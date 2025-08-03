// routes/pelayanPosition.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";

const pelayanPosition = new Hono();

const createPositionSchema = z.object({
  name: z.string().min(1, "Position name is required")
});

pelayanPosition.get("/", (c) => {
  try {
    const stmt = db.prepare("SELECT * FROM pelayanPosition ORDER BY createdAt DESC");
    const data = stmt.all();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch pelayan positions" }, 500);
  }
});

pelayanPosition.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid position ID" }, 400);
    }

    const stmt = db.prepare("SELECT * FROM pelayanPosition WHERE id = ?");
    const position = stmt.get(id);

    if (!position) {
      return c.json({ success: false, error: "Pelayan position not found" }, 404);
    }

    return c.json({ success: true, data: position });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch pelayan position" }, 500);
  }
});

pelayanPosition.patch("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid position ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = createPositionSchema.parse(body);

    const stmt = db.prepare("UPDATE pelayanPosition SET name = ? WHERE id = ?");
    const info = stmt.run(validatedData.name, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Pelayan position not found" }, 404);
    }

    const updatedPosition = db.prepare("SELECT * FROM pelayanPosition WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedPosition });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Position name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to update pelayan position" }, 500);
  }
});

pelayanPosition.delete("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid position ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM pelayanPosition WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Pelayan position not found" }, 404);
    }

    return c.json({ success: true, message: "Pelayan position deleted successfully" });
  } catch (error) {
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return c.json({ success: false, error: "Cannot delete position that is referenced by ibadah" }, 400);
    }
    return c.json({ success: false, error: "Failed to delete pelayan position" }, 500);
  }
});

export default pelayanPosition;