// routes/ibadah.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

const ibadah = new Hono();

ibadah.use("*", authenticateToken); 

const createIbadahSchema = z.object({
  id_users: z.number().int().positive("User ID must be a positive integer"),
  id_ibadahCategory: z.number().int().positive("Ibadah Category ID must be a positive integer"),
  id_pelayanPosition: z.number().int().positive("Pelayan Position ID must be a positive integer")
});

const updateIbadahSchema = z.object({
  id_users: z.number().int().positive("User ID must be a positive integer").optional(),
  id_ibadahCategory: z.number().int().positive("Ibadah Category ID must be a positive integer").optional(),
  id_pelayanPosition: z.number().int().positive("Pelayan Position ID must be a positive integer").optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  id_ibadahCategory: z.coerce.number().optional(),
  id_pelayanPosition: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

// Get all ibadah with related data
ibadah.get("/", requireRole(["admin"]), (c) => {
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

    const { search, id_ibadahCategory, id_pelayanPosition, skip, take } = queryResult.data;

    let query = `
      SELECT 
        i.id,
        i.id_users,
        i.id_ibadahCategory,
        i.id_pelayanPosition,
        i.createdAt,
        i.updatedAt,
        u.name as userName,
        ic.categoryName,
        pp.name as positionName,
        k.krw_name,
        pl.levelName
      FROM ibadah i
      LEFT JOIN users u ON i.id_users = u.id
      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
      LEFT JOIN pelayanPosition pp ON i.id_pelayanPosition = pp.id
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`(u.name LIKE ? OR ic.categoryName LIKE ? OR pp.name LIKE ? OR k.krw_name LIKE ? OR pl.levelName LIKE ?)`);
      for (let i = 0; i < 5; i++) {
        values.push(`%${search}%`);
      }
    }
    if (id_ibadahCategory !== undefined) {
      conditions.push(`i.id_ibadahCategory = ?`);
      values.push(id_ibadahCategory);
    }
    if (id_pelayanPosition !== undefined) {
      conditions.push(`i.id_pelayanPosition = ?`);
      values.push(id_pelayanPosition);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY i.createdAt DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    const data = stmt.all(...values, take, skip);

    // Build count query with same conditions
    let countQuery = `
      SELECT COUNT(*) as total
      FROM ibadah i
      LEFT JOIN users u ON i.id_users = u.id
      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
      LEFT JOIN pelayanPosition pp ON i.id_pelayanPosition = pp.id
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
    `;
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
    });
  } catch (error) {
    console.error("Error in GET /ibadahs:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch ibadah data",
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});


// Get ibadah by ID with related data
ibadah.get("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid ibadah ID" }, 400);
    }

    const stmt = db.prepare(`
      SELECT 
        i.id,
        i.id_users,
        i.id_ibadahCategory,
        i.id_pelayanPosition,
        i.createdAt,
        i.updatedAt,
        u.name as userName,
        ic.categoryName,
        pp.name as positionName,
        k.krw_name,
        pl.levelName
      FROM ibadah i
      LEFT JOIN users u ON i.id_users = u.id
      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
      LEFT JOIN pelayanPosition pp ON i.id_pelayanPosition = pp.id
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
      WHERE i.id = ?
    `);
    const ibadahData = stmt.get(id);

    if (!ibadahData) {
      return c.json({ success: false, error: "Ibadah not found" }, 404);
    }

    return c.json({ success: true, data: ibadahData });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch ibadah" }, 500);
  }
});

// Create new ibadah
ibadah.post("/", requireRole(["admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createIbadahSchema.parse(body);

    // Check if referenced records exist
    const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(validatedData.id_users);
    const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
    const positionExists = db.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validatedData.id_pelayanPosition);

    if (!userExists) {
      return c.json({ success: false, error: "User not found" }, 400);
    }
    if (!categoryExists) {
      return c.json({ success: false, error: "Ibadah category not found" }, 400);
    }
    if (!positionExists) {
      return c.json({ success: false, error: "Pelayan position not found" }, 400);
    }

    const stmt = db.prepare(`
      INSERT INTO ibadah (id_users, id_ibadahCategory, id_pelayanPosition) 
      VALUES (?, ?, ?)
    `);
    const info = stmt.run(
      validatedData.id_users,
      validatedData.id_ibadahCategory,
      validatedData.id_pelayanPosition
    );

    const newIbadah = db.prepare("SELECT * FROM ibadah WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newIbadah }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    return c.json({ success: false, error: "Failed to create ibadah" }, 500);
  }
});

// Update ibadah
ibadah.patch("/:id", requireRole(["admin"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid ibadah ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = updateIbadahSchema.parse(body);

    // Check if ibadah exists
    const ibadahExists = db.prepare("SELECT id FROM ibadah WHERE id = ?").get(id);
    if (!ibadahExists) {
      return c.json({ success: false, error: "Ibadah not found" }, 404);
    }

    // Validate foreign key references if provided
    if (validatedData.id_users) {
      const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(validatedData.id_users);
      if (!userExists) {
        return c.json({ success: false, error: "User not found" }, 400);
      }
    }

    if (validatedData.id_ibadahCategory) {
      const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
      if (!categoryExists) {
        return c.json({ success: false, error: "Ibadah category not found" }, 400);
      }
    }

    if (validatedData.id_pelayanPosition) {
      const positionExists = db.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validatedData.id_pelayanPosition);
      if (!positionExists) {
        return c.json({ success: false, error: "Pelayan position not found" }, 400);
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values = [];
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (updates.length === 0) {
      return c.json({ success: false, error: "No valid fields to update" }, 400);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE ibadah SET ${updates.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    const updatedIbadah = db.prepare("SELECT * FROM ibadah WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedIbadah });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    return c.json({ success: false, error: "Failed to update ibadah" }, 500);
  }
});

// Delete ibadah
ibadah.delete("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid ibadah ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM ibadah WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Ibadah not found" }, 404);
    }

    return c.json({ success: true, message: "Ibadah deleted successfully" });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to delete ibadah" }, 500);
  }
});

export default ibadah;