// routes/krw.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

const krw = new Hono();
krw.use("*", authenticateToken); 

const createKrwSchema = z.object({
  krw_name: z.string().min(1, "KRW name is required")
});

krw.get("/", requireRole(["admin"]), (c) => {
  try {
    const stmt = db.prepare("SELECT * FROM krw ORDER BY createdAt DESC");
    const data = stmt.all();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch KRW data" }, 500);
  }
});

krw.get("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid KRW ID" }, 400);
    }

    const stmt = db.prepare("SELECT * FROM krw WHERE id = ?");
    const krwData = stmt.get(id);

    if (!krwData) {
      return c.json({ success: false, error: "KRW not found" }, 404);
    }

    return c.json({ success: true, data: krwData });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch KRW" }, 500);
  }
});

krw.post("/", requireRole(["admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createKrwSchema.parse(body);

    const stmt = db.prepare("INSERT INTO krw (krw_name) VALUES (?)");
    const info = stmt.run(validatedData.krw_name);

    const newKrw = db.prepare("SELECT * FROM krw WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newKrw }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "KRW name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to create KRW" }, 500);
  }
});

krw.patch("/:id", requireRole(["admin"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid KRW ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = createKrwSchema.parse(body);

    const stmt = db.prepare("UPDATE krw SET krw_name = ? WHERE id = ?");
    const info = stmt.run(validatedData.krw_name, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "KRW not found" }, 404);
    }

    const updatedKrw = db.prepare("SELECT * FROM krw WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedKrw });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "KRW name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to update KRW" }, 500);
  }
});

krw.delete("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid KRW ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM krw WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "KRW not found" }, 404);
    }

    return c.json({ success: true, message: "KRW deleted successfully" });
  } catch (error) {
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return c.json({ success: false, error: "Cannot delete KRW that is referenced by users" }, 400);
    }
    return c.json({ success: false, error: "Failed to delete KRW" }, 500);
  }
});

export default krw;