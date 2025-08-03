// routes/users.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";

const users = new Hono();

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  id_krw: z.number().int().positive("KRW ID must be a positive integer"),
  id_category: z.number().int().positive("Category ID must be a positive integer"),
  id_pelayanLevel: z.number().int().positive("Pelayan Level ID must be a positive integer")
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  id_krw: z.number().int().positive("KRW ID must be a positive integer").optional(),
  id_category: z.number().int().positive("Category ID must be a positive integer").optional(),
  id_pelayanLevel: z.number().int().positive("Pelayan Level ID must be a positive integer").optional()
});

// Get all users with related data
users.get("/", (c) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.id_krw,
        u.id_category,
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.krw_name,
        ic.categoryName,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN ibadahCategory ic ON u.id_category = ic.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
      ORDER BY u.createdAt DESC
    `);
    const data = stmt.all();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch users" }, 500);
  }
});

// Get user by ID with related data
users.get("/:id", (c) => {
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
        u.id_category,
        u.id_pelayanLevel,
        u.createdAt,
        u.updatedAt,
        k.krw_name,
        ic.categoryName,
        pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN ibadahCategory ic ON u.id_category = ic.id
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
users.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createUserSchema.parse(body);

    // Check if referenced records exist
    const krwExists = db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
    const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_category);
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
      INSERT INTO users (name, id_krw, id_category, id_pelayanLevel) 
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(
      validatedData.name,
      validatedData.id_krw,
      validatedData.id_category,
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
users.patch("/:id", async (c) => {
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

    if (validatedData.id_category) {
      const categoryExists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_category);
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
users.delete("/:id", (c) => {
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