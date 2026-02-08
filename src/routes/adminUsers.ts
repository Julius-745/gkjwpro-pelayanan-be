import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";
import bcrypt from "bcryptjs";

const adminUsers = new OpenAPIHono<AppEnv>();

// Explicit interfaces for database results to avoid 'any'
interface AdminUserRow {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// Schemas
const AdminUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const CreateAdminUserDTO = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["super_admin", "admin", "user"]).default("user"),
  isActive: z.boolean().default(true),
});

const UpdateAdminUserDTO = CreateAdminUserDTO.partial().openapi(
  "UpdateAdminUserRequest",
);

// Route Definitions
const listAdminUsersRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all administrative users",
  tags: ["Admin Users"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional().default(""),
      skip: z.coerce.number().int().nonnegative().default(0),
      take: z.coerce.number().int().positive().max(100).default(10),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(AdminUserSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
            totalPages: z.number(),
          }),
        },
      },
      description: "Successfully retrieved admin users",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Forbidden",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Unauthorized",
    },
  },
});

const getAdminUserRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get admin user by ID",
  tags: ["Admin Users"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AdminUserSchema }),
        },
      },
      description: "Admin user found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Admin user not found",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Forbidden",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Unauthorized",
    },
  },
});

const createAdminUserRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new admin user",
  tags: ["Admin Users"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateAdminUserDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AdminUserSchema }),
        },
      },
      description: "Admin user created",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Invalid input or duplicate",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Forbidden",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Unauthorized",
    },
  },
});

const updateAdminUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update an admin user",
  tags: ["Admin Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: UpdateAdminUserDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AdminUserSchema }),
        },
      },
      description: "Admin user updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Admin user not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Invalid input",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Forbidden",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Unauthorized",
    },
  },
});

const deleteAdminUserRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete an admin user",
  tags: ["Admin Users"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Admin user deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Admin user not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Conflict",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Forbidden",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Unauthorized",
    },
  },
});

// Implementation
adminUsers.openapi(listAdminUsersRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { search, skip, take } = c.req.valid("query");

  let query = `SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users`;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`(username LIKE ? OR email LIKE ?)`);
    values.push(`%${search}%`, `%${search}%`);
  }
  if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

  const rows = db.prepare(query).all(...values, take, skip) as AdminUserRow[];
  const data = rows.map((row) => ({
    ...row,
    isActive: Boolean(row.isActive),
  }));

  let countQuery = `SELECT COUNT(*) as total FROM admin_users`;
  if (conditions.length > 0) countQuery += ` WHERE ` + conditions.join(" AND ");
  const countResult = db.prepare(countQuery).get(...values) as {
    total: number;
  };
  const total = countResult?.total ?? 0;

  return c.json(
    {
      success: true,
      data,
      total,
      skip,
      take,
      totalPages: Math.ceil(total / take),
    },
    200,
  );
});

adminUsers.openapi(getAdminUserRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const row = db
    .prepare(
      "SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users WHERE id = ?",
    )
    .get(id) as AdminUserRow | undefined;

  if (!row) {
    return c.json({ success: false, error: "Admin user not found" }, 404);
  }

  const user = {
    ...row,
    isActive: Boolean(row.isActive),
  };

  return c.json({ success: true, data: user }, 200);
});

adminUsers.openapi(createAdminUserRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { username, email, password, role, isActive } = c.req.valid("json");
  try {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const info = db
      .prepare(
        "INSERT INTO admin_users (username, email, password, role, isActive) VALUES (?, ?, ?, ?, ?)",
      )
      .run(username, email, hashedPassword, role, isActive ? 1 : 0);

    const row = db
      .prepare(
        "SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users WHERE id = ?",
      )
      .get(info.lastInsertRowid) as AdminUserRow;

    const newUser = {
      ...row,
      isActive: Boolean(row.isActive),
    };

    return c.json({ success: true, data: newUser }, 201);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Username or email already exists" },
        400,
      );
    }
    throw error;
  }
});

adminUsers.openapi(updateAdminUserRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const body = c.req.valid("json");

  try {
    const sets: string[] = [];
    const values: (string | number)[] = [];

    if (body.username) {
      sets.push("username = ?");
      values.push(body.username);
    }
    if (body.email) {
      sets.push("email = ?");
      values.push(body.email);
    }
    if (body.role) {
      sets.push("role = ?");
      values.push(body.role);
    }
    if (body.isActive !== undefined) {
      sets.push("isActive = ?");
      values.push(body.isActive ? 1 : 0);
    }
    if (body.password) {
      const hashedPassword = await bcrypt.hash(body.password, 12);
      sets.push("password = ?");
      values.push(hashedPassword);
    }

    if (sets.length === 0) {
      const row = db
        .prepare("SELECT * FROM admin_users WHERE id = ?")
        .get(id) as AdminUserRow;
      return c.json(
        { success: true, data: { ...row, isActive: Boolean(row.isActive) } },
        200,
      );
    }

    const info = db
      .prepare(`UPDATE admin_users SET ${sets.join(", ")} WHERE id = ?`)
      .run(...values, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Admin user not found" }, 404);
    }

    const row = db
      .prepare(
        "SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users WHERE id = ?",
      )
      .get(id) as AdminUserRow;

    const updatedUser = {
      ...row,
      isActive: Boolean(row.isActive),
    };

    return c.json({ success: true, data: updatedUser }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Username or email already exists" },
        400,
      );
    }
    throw error;
  }
});

adminUsers.openapi(deleteAdminUserRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");

  // Prevent self-deletion
  if (currentUser.id === id) {
    return c.json(
      { success: false, error: "Cannot delete your own account" },
      400,
    );
  }

  const info = db.prepare("DELETE FROM admin_users WHERE id = ?").run(id);

  if (info.changes === 0) {
    return c.json({ success: false, error: "Admin user not found" }, 404);
  }

  return c.json(
    { success: true, message: "Admin user deleted successfully" },
    200,
  );
});

export default adminUsers;
