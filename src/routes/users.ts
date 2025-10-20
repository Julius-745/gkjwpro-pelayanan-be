// routes/users.ts - Updated with proper RBAC
import { Hono, type Context } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

interface UserQuery {
  search?: string
  id_krw?: string
  id_pelayanLevel?: string
}

const users = new Hono();

// All routes require authentication
users.use("*", authenticateToken); 

// Validation schemas
const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  id_krw: z.number().int(),
  id_pelayanLevel: z.number().int()
});

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  id_krw: z.number().int().optional(),
  id_pelayanLevel: z.number().int().optional(),
  active: z.boolean().optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  active: z.coerce.boolean().optional(),
  id_krw: z.coerce.number().optional(),
  id_pelayanLevel: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
});

/**
 * GET /users
 * Get all users with filters and pagination
 * Access: super_admin and admin only
 */
users.get("/", requireRole(["super_admin", "admin"]), (c: Context) => {
  try {
    const currentUser = c.get('user');
    console.log(`[RBAC] User ${currentUser.username} (${currentUser.role}) accessing users list`);

    const queryResult = querySchema.safeParse(c.req.query());

    if (!queryResult.success) {
      return c.json(
        {
          success: false,
          message: "Invalid query parameters",
          errors: queryResult.error.errors,
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
      active: Boolean(row.active),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      krw: row.krw_id
        ? {
            id: row.krw_id,
            name: row.krw_name,
          }
        : null,
      pelayanLevel: row.pelayanLevel_id
        ? {
            id: row.pelayanLevel_id,
            name: row.levelName,
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
        message: error instanceof Error ? error.message : "Failed to fetch users",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

/**
 * GET /users/:id
 * Get user by ID with related data
 * Access: super_admin and admin only
 */
users.get("/:id", requireRole(["super_admin", "admin"]), (c) => {
  try {
    const currentUser = c.get('user');
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    console.log(`[RBAC] User ${currentUser.username} (${currentUser.role}) accessing user ${id}`);

    const stmt = db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.active,
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
      return c.json({ success: false, message: "User not found" }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (error) {
    console.error("Error in GET /users/:id:", error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to fetch user" 
    }, 500);
  }
});

/**
 * POST /users
 * Create new user
 * Access: super_admin and admin only
 */
users.post("/", requireRole(["super_admin", "admin"]), async (c) => {
  try {
    const currentUser = c.get('user');
    const body = await c.req.json();
    const validatedData = createUserSchema.parse(body);

    console.log(`[RBAC] User ${currentUser.username} (${currentUser.role}) creating new user`);

    // Check if referenced records exist
    const krwExists = db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
    const levelExists = db.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);

    if (!krwExists) {
      return c.json({ success: false, message: "KRW not found" }, 400);
    }
    if (!levelExists) {
      return c.json({ success: false, message: "Pelayan level not found" }, 400);
    }

    // Insert new user (active by default)
    const stmt = db.prepare(`
      INSERT INTO users (name, active, id_krw, id_pelayanLevel) 
      VALUES (?, 1, ?, ?)
    `);
    const info = stmt.run(
      validatedData.name,
      validatedData.id_krw,
      validatedData.id_pelayanLevel
    );

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
    
    console.log(`[RBAC] User ${currentUser.username} created new user ID: ${info.lastInsertRowid}`);
    
    return c.json({ success: true, data: newUser }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        success: false, 
        message: "Validation error",
        errors: error.errors 
      }, 400);
    }
    console.error("Error in POST /users:", error);
    return c.json({ 
      success: false, 
      message: "Failed to create user" 
    }, 500);
  }
});

/**
 * PATCH /users/:id
 * Update user
 * Access: super_admin and admin only
 */
users.patch("/:id", requireRole(["super_admin", "admin"]), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = updateUserSchema.parse(body);

    console.log(`[RBAC] User ${currentUser.username} (${currentUser.role}) updating user ${id}`);

    // Check if user exists
    const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!userExists) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Validate foreign key references if provided
    if (validatedData.id_krw) {
      const krwExists = db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
      if (!krwExists) {
        return c.json({ success: false, message: "KRW not found" }, 400);
      }
    }

    if (validatedData.id_pelayanLevel) {
      const levelExists = db.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);
      if (!levelExists) {
        return c.json({ success: false, message: "Pelayan level not found" }, 400);
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    
    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        // Convert boolean to 0/1 for SQLite
        values.push(typeof value === 'boolean' ? (value ? 1 : 0) : value);
      }
    });

    if (updates.length === 0) {
      return c.json({ success: false, message: "No valid fields to update" }, 400);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`);
    stmt.run(...values);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    
    console.log(`[RBAC] User ${currentUser.username} updated user ${id}`);
    
    return c.json({ success: true, data: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        success: false, 
        message: "Validation error",
        errors: error.errors 
      }, 400);
    }
    console.error("Error in PATCH /users/:id:", error);
    return c.json({ 
      success: false, 
      message: "Failed to update user" 
    }, 500);
  }
});

/**
 * DELETE /users/:id
 * Delete user
 * Access: super_admin only (admin cannot delete users)
 */
users.delete("/:id", requireRole(["super_admin"]), (c) => {
  try {
    const currentUser = c.get('user');
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    console.log(`[RBAC] Super admin ${currentUser.username} attempting to delete user ${id}`);

    // Check if user has assignments
    const hasAssignments = db.prepare(
      "SELECT COUNT(*) as count FROM ibadah_assignments WHERE id_users = ?"
    ).get(id) as any;

    if (hasAssignments && hasAssignments.count > 0) {
      return c.json({ 
        success: false, 
        message: `Cannot delete user. User has ${hasAssignments.count} assignment(s). Please remove assignments first.` 
      }, 400);
    }

    const stmt = db.prepare("DELETE FROM users WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    console.log(`[RBAC] Super admin ${currentUser.username} deleted user ${id}`);

    return c.json({ 
      success: true, 
      message: "User deleted successfully" 
    });
  } catch (error) {
    console.error("Error in DELETE /users/:id:", error);
    return c.json({ 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to delete user" 
    }, 500);
  }
});

/**
 * PATCH /users/:id/toggle-active
 * Toggle user active status (soft delete alternative)
 * Access: super_admin and admin
 */
users.patch("/:id/toggle-active", requireRole(["super_admin", "admin"]), async (c) => {
  try {
    const currentUser = c.get('user');
    const id = parseInt(c.req.param("id"));
    
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    console.log(`[RBAC] User ${currentUser.username} (${currentUser.role}) toggling active status for user ${id}`);

    // Get current status
    const user = db.prepare("SELECT id, active FROM users WHERE id = ?").get(id) as any;
    
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    const newStatus = user.active ? 0 : 1;
    const stmt = db.prepare("UPDATE users SET active = ? WHERE id = ?");
    stmt.run(newStatus, id);

    const updatedUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);

    console.log(`[RBAC] User ${currentUser.username} toggled user ${id} active status to ${newStatus ? 'active' : 'inactive'}`);

    return c.json({ 
      success: true, 
      message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser 
    });
  } catch (error) {
    console.error("Error in PATCH /users/:id/toggle-active:", error);
    return c.json({ 
      success: false, 
      message: "Failed to toggle user status" 
    }, 500);
  }
});

export default users;