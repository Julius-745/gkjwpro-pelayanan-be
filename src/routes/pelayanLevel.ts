// routes/pelayanLevel.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

const pelayanLevel = new Hono();
pelayanLevel.use("*", authenticateToken); 


const createLevelSchema = z.object({
  levelName: z.string().min(1, "Level name is required")
});

const querySchema = z.object({
  search: z.string().optional().default(''),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

pelayanLevel.get("/", requireRole(["super_admin", "admin"]), (c) => {
  try {
    const queryResult = querySchema.safeParse(c.req.query());

    if (!queryResult.success) {
      console.error("Query validation failed:", queryResult.error);
      return c.json({
        success: false,
        error: "Invalid query parameters",
        details: queryResult.error.errors
      }, 400);
    }

    const { search, skip, take } = queryResult.data;

    let query = `
      SELECT 
        pl.id,
        pl.levelName,
        pl.createdAt,
        pl.updatedAt
      FROM pelayanLevel pl
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`pl.levelName LIKE ?`);
      values.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY pl.createdAt DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    const data = stmt.all(...values, take, skip);

    // Build count query with same conditions
    let countQuery = `SELECT COUNT(*) as total FROM pelayanLevel pl`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ` + conditions.join(" AND ");
    }

    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...values);

    const total = countResult && typeof countResult === 'object' && 'total' in countResult
      ? (countResult as { total: number }).total
      : 0;

    return c.json({
      success: true,
      data,
      total,
      skip,
      take,
      totalPages: Math.ceil(total / take),
    });
  } catch (error) {
    console.error("Error in GET /pelayanLevel:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    } else {
      console.error("Unknown error:", error);
    }

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : JSON.stringify(error),
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});

pelayanLevel.get("/:id", requireRole(["super_admin", "admin"]), (c) => {
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

pelayanLevel.post("/", requireRole(["super_admin", "admin"]), async (c) => {
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

pelayanLevel.patch("/:id", requireRole(["super_admin", "admin"]), async (c) => {
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

pelayanLevel.delete("/:id", requireRole(["super_admin"]), (c) => {
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