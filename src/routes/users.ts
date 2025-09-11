// routes/users.ts
import { Hono, type Context } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole } from "../middleware/authMiddleware";
import { authenticateToken } from "../middleware/authMiddleware";

interface UserQuery {
  search?: string
  id_krw?: string
  id_ibadahCategory?: string
  id_pelayanLevel?: string
}

const users = new Hono();

users.use("*", authenticateToken); 

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  id_krw: z.number().int().positive("KRW ID must be a positive integer"),
  id_ibadahCategory: z.number().int().positive("Category ID must be a positive integer"),
  id_pelayanLevel: z.number().int().positive("Pelayan Level ID must be a positive integer")
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  id_krw: z.number().int().positive("KRW ID must be a positive integer").optional(),
  id_ibadahCategory: z.number().int().positive("Category ID must be a positive integer").optional(),
  id_pelayanLevel: z.number().int().positive("Pelayan Level ID must be a positive integer").optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  id_krw: z.coerce.number().optional(),
  id_ibadahCategory: z.coerce.number().optional(),
  id_pelayanLevel: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

users.get("/", requireRole(["admin"]), (c: Context) => {
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

    const { search, id_krw, id_ibadahCategory, id_pelayanLevel, skip, take } = queryResult.data;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.id_krw,
        u.id_ibadahCategory,
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.krw_name,
        ic.categoryName,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN ibadahCategory ic ON u.id_ibadahCategory = ic.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`u.name LIKE ?`);
      values.push(`%${search}%`);
    }
    if (id_krw !== undefined) {
      conditions.push(`u.id_krw = ?`);
      values.push(id_krw);
    }
    if (id_ibadahCategory !== undefined) {
      conditions.push(`u.id_ibadahCategory = ?`);
      values.push(id_ibadahCategory);
    }
    if (id_pelayanLevel !== undefined) {
      conditions.push(`u.id_pelayanLevel = ?`);
      values.push(id_pelayanLevel);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`;

    
    const stmt = db.prepare(query);
    const data = stmt.all(...values, take, skip);

    // Build count query with same conditions
    let countQuery = `SELECT COUNT(*) as total FROM users u`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ` + conditions.join(" AND ");
    }
    
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...values);
    
    // Ensure we have a valid count result
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
    console.error("Error in GET /users:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    return c.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch users",
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});


// Get user by ID with related data
users.get("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.id_krw,
        u.id_ibadahCategory,
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.krw_name,
        ic.categoryName,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN ibadahCategory ic ON u.id_ibadahCategory = ic.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
      WHERE u.id = ?
    `);
    const user = stmt.get(id);

    if (!user) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch user" }, 500);
  }
});

// Create new user
users.post("/", requireRole(["admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if referenced records exist
    const krwExists = db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
    const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
    const levelExists = db.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);

    if (!krwExists) {
      return c.json({ success: false, error: "KRW not found" }, 400);
    }
    if (!categoryExists) {
      return c.json({ success: false, error: "Ibadah category not found" }, 400);
    }
    if (!levelExists) {
      return c.json({ success: false, error: "Pelayan level not found" }, 400);
    }

    const stmt = db.prepare(`
      INSERT INTO users (name, id_krw, id_ibadahCategory, id_pelayanLevel) 
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(
      validatedData.name,
      validatedData.id_krw,
      validatedData.id_ibadahCategory,
      validatedData.id_pelayanLevel
    );

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newUser }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    return c.json({ success: false, error: "Failed to create user" }, 500);
  }
});

// Update user
users.patch("/:id", requireRole(["admin"]), async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!userExists) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    // Validate foreign key references if provided
    if (validatedData.id_krw) {
      const krwExists = db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
      if (!krwExists) {
        return c.json({ success: false, error: "KRW not found" }, 400);
      }
    }

    if (validatedData.id_ibadahCategory) {
      const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
      if (!categoryExists) {
        return c.json({ success: false, error: "Ibadah category not found" }, 400);
      }
    }

    if (validatedData.id_pelayanLevel) {
      const levelExists = db.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);
      if (!levelExists) {
        return c.json({ success: false, error: "Pelayan level not found" }, 400);
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
    const stmt = db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    return c.json({ success: false, error: "Failed to update user" }, 500);
  }
});

// Delete user
users.delete("/:id", requireRole(["admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "User not found" }, 404);
    }

    return c.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to delete user" }, 500);
  }
});

export default users;