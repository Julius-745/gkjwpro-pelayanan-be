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

const querySchema = z.object({
  search: z.string().optional().default(''),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

krw.get("/", requireRole(["super_admin", "admin"]), async (c) => {
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
        k.id,
        k.krw_name,
        k.createdAt,
        k.updatedAt
      FROM krw k
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`k.krw_name LIKE ?`);
      values.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY k.createdAt DESC LIMIT ? OFFSET ?`;

    // Ensure the number of parameters matches the placeholders
    const stmt = db.prepare(query);
    const data = stmt.all(...values, take, skip);

    // Build count query with same conditions
    let countQuery = `SELECT COUNT(*) as total FROM krw k`;
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
    console.error("Error in GET /krw:", error);

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

krw.get("/:id", requireRole(["super_admin", "admin"]), (c) => {
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

krw.post("/", requireRole(["super_admin", "admin"]), async (c) => {
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

krw.patch("/:id", requireRole(["super_admin", "admin"]), async (c) => {
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

krw.delete("/:id", requireRole(["super_admin"]), (c) => {
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