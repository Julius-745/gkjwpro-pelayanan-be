// routes/ibadahCategory.ts
import { Hono } from "hono";
import db from "../db";
import { string, z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

const ibadahCategory = new Hono();

ibadahCategory.use("*", authenticateToken); 

const createCategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required")
});

const querySchema = z.object({
  search: z.string().optional().default(''),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

ibadahCategory.get("/", requireRole(["admin"]), (c) => {
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
        id,
        categoryName,
        createdAt,
        updatedAt
      FROM ibadahCategory
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`categoryName LIKE ?`);
      values.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    const data = stmt.all(...values, take, skip);

    // Build count query with same conditions
    let countQuery = `SELECT COUNT(*) as total FROM ibadahCategory`;
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
    console.error("Error in GET /ibadahCategory:", error);

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


ibadahCategory.get("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const stmt = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?");
    const category = stmt.get(id);

    if (!category) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch ibadah category" }, 500);
  }
});

ibadahCategory.post("/", requireRole(["admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createCategorySchema.parse(body);

    const stmt = db.prepare("INSERT INTO ibadahCategory (categoryName) VALUES (?)");
    const info = stmt.run(validatedData.categoryName);

    const newCategory = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newCategory }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Category name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to create ibadah category" }, 500);
  }
});

ibadahCategory.patch("/:id", requireRole(["admin"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = createCategorySchema.parse(body);

    const stmt = db.prepare("UPDATE ibadahCategory SET categoryName = ? WHERE id = ?");
    const info = stmt.run(validatedData.categoryName, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    const updatedCategory = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Category name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to update ibadah category" }, 500);
  }
});

ibadahCategory.delete("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM ibadahCategory WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    return c.json({ success: true, message: "Ibadah category deleted successfully" });
  } catch (error) {
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return c.json({ success: false, error: "Cannot delete category that is referenced by users or ibadah" }, 400);
    }
    return c.json({ success: false, error: "Failed to delete ibadah category" }, 500);
  }
});

export default ibadahCategory;