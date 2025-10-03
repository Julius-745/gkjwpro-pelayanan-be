// routes/users.ts
import { Hono, type Context } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole } from "../middleware/authMiddleware";
import { authenticateToken } from "../middleware/authMiddleware";
import { act } from "react";

interface UserQuery {
  search?: string
  id_krw?: string
  id_pelayanLevel?: string
}

const users = new Hono();

users.use("*", authenticateToken); 

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  id_krw: z.number().int(),
  id_pelayanLevel: z.number().int()
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  id_krw: z.number().int(),
  id_pelayanLevel: z.number().int()
});

const querySchema = z.object({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
  id_krw: z.coerce.number().optional(),
  id_pelayanLevel: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
})

users.get("/", requireRole(["admin"]), (c: Context) => {
  try {
    const queryResult = querySchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: queryResult.error.errors,
        },
        400
      );
    }

    const { search, active, id_krw, id_pelayanLevel, skip, take } = queryResult.data;

    let query = `
      SELECT 
        u.id,
        u.name,
        u.active,
        u.id_krw,
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.id as krw_id,
        k.krw_name,
        pl.id as pelayanLevel_id,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
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
    if (id_pelayanLevel !== undefined) {
      conditions.push(`u.id_pelayanLevel = ?`);
      values.push(id_pelayanLevel);
    }
    if (active !== undefined) {
      conditions.push(`u.active = ?`);
      values.push(active ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...values, take, skip);

    // Transform rows → nested objects
    const data = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      krw: row.krw_id
        ? {
            id: row.krw_id,
            name: row.krw_name,
            code: row.krw_code,
          }
        : null,
      pelayanLevel: row.pelayanLevel_id
        ? {
            id: row.pelayanLevel_id,
            name: row.levelName,
            description: row.levelDescription,
          }
        : null,
    }));

    // Count query
    let countQuery = `SELECT COUNT(*) as total FROM users u`;
    if (conditions.length > 0) {
      countQuery += ` WHERE ` + conditions.join(" AND ");
    }

    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...values);
    const total =
      countResult && typeof countResult === "object" && "total" in countResult
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
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch users",
        timestamp: new Date().toISOString(),
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
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.krw_name,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
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
    const levelExists = db.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);

    if (!krwExists) {
      return c.json({ success: false, error: "KRW not found" }, 400);
    }
    if (!levelExists) {
      return c.json({ success: false, error: "Pelayan level not found" }, 400);
    }

    const stmt = db.prepare(`
      INSERT INTO users (name, active, id_krw, id_pelayanLevel) 
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(
      validatedData.name,
      validatedData.id_krw,
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