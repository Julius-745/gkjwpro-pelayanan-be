// routes/admin-users.ts
import { Hono, type Context } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole } from "../middleware/authMiddleware";
import { authenticateToken } from "../middleware/authMiddleware";
import bcrypt from "bcryptjs";

const adminUsers = new Hono();

adminUsers.use("*", authenticateToken);

// Validation schemas
const createAdminUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["super_admin", "admin", "user"]).default("admin"),
  isActive: z.boolean().default(true)
});

const updateAdminUserSchema = z.object({
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["super_admin", "admin", "user"]).optional(),
  isActive: z.boolean().optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  role: z.enum(["super_admin", "admin", "user"]).optional(),
  isActive: z.coerce.boolean().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
});

// Get all admin users (super_admin and admin only)
adminUsers.get("/", requireRole(["super_admin", "admin"]), (c: Context) => {
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

    const { search, role, isActive, skip, take } = queryResult.data;

    let query = `
      SELECT 
        id,
        username,
        email,
        role,
        isActive,
        lastLogin,
        createdAt,
        updatedAt
      FROM admin_users
    `;

    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (search) {
      conditions.push(`(username LIKE ? OR email LIKE ?)`);
      values.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      conditions.push(`role = ?`);
      values.push(role);
    }
    if (isActive !== undefined) {
      conditions.push(`isActive = ?`);
      values.push(isActive ? 1 : 0);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(" AND ");
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...values, take, skip);

    // Remove password from response
    const data = rows.map((row: any) => {
      const { password, ...userWithoutPassword } = row;
      return userWithoutPassword;
    });

    // Count query
    let countQuery = `SELECT COUNT(*) as total FROM admin_users`;
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
    console.error("Error in GET /admin-users:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch admin users",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Get admin user by ID (super_admin and admin only)
adminUsers.get("/:id", requireRole(["super_admin", "admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    const stmt = db.prepare(`
      SELECT 
        id,
        username,
        email,
        role,
        isActive,
        lastLogin,
        createdAt,
        updatedAt
      FROM admin_users
      WHERE id = ?
    `);
    const user = stmt.get(id);

    if (!user) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }

    return c.json({ success: true, data: user });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch admin user" 
    }, 500);
  }
});

// Create new admin user (super_admin only)
adminUsers.post("/", requireRole(["super_admin"]), async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createAdminUserSchema.parse(body);

    // Check if username or email already exists
    const existingUser = db.prepare(
      "SELECT id FROM admin_users WHERE username = ? OR email = ?"
    ).get(validatedData.username, validatedData.email);

    if (existingUser) {
      return c.json({ 
        success: false, 
        error: "Username or email already exists" 
      }, 400);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    const stmt = db.prepare(`
      INSERT INTO admin_users (username, email, password, role, isActive) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      validatedData.username,
      validatedData.email,
      hashedPassword,
      validatedData.role,
      validatedData.isActive ? 1 : 0
    );

    const newUser = db.prepare(`
      SELECT 
        id,
        username,
        email,
        role,
        isActive,
        createdAt,
        updatedAt
      FROM admin_users 
      WHERE id = ?
    `).get(info.lastInsertRowid);

    return c.json({ success: true, data: newUser }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        success: false, 
        error: "Validation error",
        details: error.errors 
      }, 400);
    }
    console.error("Error creating admin user:", error);
    return c.json({ 
      success: false, 
      error: "Failed to create admin user" 
    }, 500);
  }
});

// Update admin user (super_admin only, admin can update self)
adminUsers.patch("/:id", authenticateToken, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = updateAdminUserSchema.parse(body);

    // Get current user from token
    const currentUser = c.get("user");
    
    // Check permissions
    const isSuperAdmin = currentUser.role === "super_admin";
    const isAdmin = currentUser.role === "admin";
    const isUpdatingSelf = currentUser.id === id;

    // Only super_admin can update any user
    // Admin can only update themselves
    if (!isSuperAdmin && (!isAdmin || !isUpdatingSelf)) {
      return c.json({ 
        success: false, 
        error: "Insufficient permissions" 
      }, 403);
    }

    // Check if user exists
    const userExists = db.prepare(
      "SELECT id, role FROM admin_users WHERE id = ?"
    ).get(id) as any;
    
    if (!userExists) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }

    // Prevent admin from changing role (only super_admin can)
    if (validatedData.role && !isSuperAdmin) {
      return c.json({ 
        success: false, 
        error: "Only super admin can change user roles" 
      }, 403);
    }

    // Prevent last super_admin from being demoted or deactivated
    if (userExists.role === "super_admin" && 
        (validatedData.role !== "super_admin" || validatedData.isActive === false)) {
      const superAdminCount = db.prepare(
        "SELECT COUNT(*) as count FROM admin_users WHERE role = 'super_admin' AND isActive = 1"
      ).get() as any;

      if (superAdminCount.count <= 1) {
        return c.json({ 
          success: false, 
          error: "Cannot demote or deactivate the last super admin" 
        }, 400);
      }
    }

    // Check for duplicate username/email
    if (validatedData.username || validatedData.email) {
      const duplicateCheck = db.prepare(`
        SELECT id FROM admin_users 
        WHERE (username = ? OR email = ?) AND id != ?
      `).get(
        validatedData.username || "",
        validatedData.email || "",
        id
      );

      if (duplicateCheck) {
        return c.json({ 
          success: false, 
          error: "Username or email already exists" 
        }, 400);
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];

    if (validatedData.username !== undefined) {
      updates.push("username = ?");
      values.push(validatedData.username);
    }
    if (validatedData.email !== undefined) {
      updates.push("email = ?");
      values.push(validatedData.email);
    }
    if (validatedData.password !== undefined) {
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      updates.push("password = ?");
      values.push(hashedPassword);
    }
    if (validatedData.role !== undefined && isSuperAdmin) {
      updates.push("role = ?");
      values.push(validatedData.role);
    }
    if (validatedData.isActive !== undefined && isSuperAdmin) {
      updates.push("isActive = ?");
      values.push(validatedData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return c.json({ 
        success: false, 
        error: "No valid fields to update" 
      }, 400);
    }

    values.push(id);
    const stmt = db.prepare(
      `UPDATE admin_users SET ${updates.join(", ")} WHERE id = ?`
    );
    stmt.run(...values);

    const updatedUser = db.prepare(`
      SELECT 
        id,
        username,
        email,
        role,
        isActive,
        lastLogin,
        createdAt,
        updatedAt
      FROM admin_users 
      WHERE id = ?
    `).get(id);

    return c.json({ success: true, data: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ 
        success: false, 
        error: "Validation error",
        details: error.errors 
      }, 400);
    }
    console.error("Error updating admin user:", error);
    return c.json({ 
      success: false, 
      error: "Failed to update admin user" 
    }, 500);
  }
});

// Delete admin user (super_admin only)
adminUsers.delete("/:id", requireRole(["super_admin"]), (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid user ID" }, 400);
    }

    // Check if user exists and get role
    const user = db.prepare(
      "SELECT id, role FROM admin_users WHERE id = ?"
    ).get(id) as any;

    if (!user) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }

    // Prevent deleting the last super_admin
    if (user.role === "super_admin") {
      const superAdminCount = db.prepare(
        "SELECT COUNT(*) as count FROM admin_users WHERE role = 'super_admin' AND isActive = 1"
      ).get() as any;

      if (superAdminCount.count <= 1) {
        return c.json({ 
          success: false, 
          error: "Cannot delete the last super admin" 
        }, 400);
      }
    }

    // Prevent self-deletion
    const currentUser = c.get("user");
    if (currentUser.id === id) {
      return c.json({ 
        success: false, 
        error: "Cannot delete your own account" 
      }, 400);
    }

    const stmt = db.prepare("DELETE FROM admin_users WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }

    return c.json({ 
      success: true, 
      message: "Admin user deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting admin user:", error);
    return c.json({ 
      success: false, 
      error: "Failed to delete admin user" 
    }, 500);
  }
});

export default adminUsers;