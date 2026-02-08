import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

// Interfaces for DB results
interface UserRow {
  id: number;
  name: string;
  active: number;
  createdAt: string;
  updatedAt: string;
  id_krw: number;
  id_pelayanLevel: number;
  krw_id: number | null;
  krw_name: string | null;
  pelayanLevel_id: number | null;
  levelName: string | null;
}

const users = new OpenAPIHono<AppEnv>();

// Schemas
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  krw: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable(),
  pelayanLevel: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable(),
});

const CreateUserDTO = z
  .object({
    name: z.string().min(1, "Name is required"),
    id_krw: z.number().int(),
    id_pelayanLevel: z.number().int(),
  })
  .openapi("CreateUserRequest");

const UpdateUserDTO = z
  .object({
    name: z.string().min(1, "Name is required").optional(),
    id_krw: z.number().int().optional(),
    id_pelayanLevel: z.number().int().optional(),
    active: z.boolean().optional(),
  })
  .openapi("UpdateUserRequest");

// Route Definitions
const listUsersRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all users",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      active: z.enum(["true", "false"]).optional(),
      id_krw: z.coerce.number().optional(),
      id_pelayanLevel: z.coerce.number().optional(),
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
            data: z.array(UserSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
          }),
        },
      },
      description: "Successfully retrieved users",
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

const getUserRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get user by ID",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.coerce.number(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: UserSchema }),
        },
      },
      description: "User found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "User not found",
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

const createUserRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new user",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateUserDTO } },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: UserSchema }),
        },
      },
      description: "User created",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
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

const updateUserRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update an existing user",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: {
      content: { "application/json": { schema: UpdateUserDTO } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: UserSchema }),
        },
      },
      description: "User updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "User not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
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

const deleteUserRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a user",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "User deleted",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Conflict or error",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "User not found",
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

const toggleActiveRoute = createRoute({
  method: "patch",
  path: "/{id}/toggle-active",
  summary: "Toggle user active status",
  tags: ["Users"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            newStatus: z.boolean(),
          }),
        },
      },
      description: "Status toggled",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "User not found",
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
users.openapi(listUsersRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || !["super_admin", "admin"].includes(currentUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const {
    search,
    active: activeStr,
    id_krw,
    id_pelayanLevel,
    skip,
    take,
  } = c.req.valid("query");
  const active =
    activeStr === "true" ? true : activeStr === "false" ? false : undefined;

  let query = `
    SELECT u.id, u.name, u.active, u.id_krw, u.id_pelayanLevel, u.createdAt, u.updatedAt,
           k.id as krw_id, k.krw_name, pl.id as pelayanLevel_id, pl.levelName
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

  const rows = db.prepare(query).all(...values, take, skip) as UserRow[];
  const data = rows.map((row) => ({
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    krw: row.krw_id ? { id: row.krw_id, name: row.krw_name! } : null,
    pelayanLevel: row.pelayanLevel_id
      ? { id: row.pelayanLevel_id, name: row.levelName! }
      : null,
  }));

  let countQuery = `SELECT COUNT(*) as total FROM users u`;
  if (conditions.length > 0) {
    countQuery += ` WHERE ` + conditions.join(" AND ");
  }
  const countResult = db.prepare(countQuery).get(...values) as {
    total: number;
  };
  const total = countResult?.total ?? 0;

  return c.json({ success: true, data, total, skip, take }, 200);
});

users.openapi(getUserRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || !["super_admin", "admin"].includes(currentUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const stmt = db.prepare(`
    SELECT u.id, u.name, u.active, u.id_krw, u.id_pelayanLevel, u.createdAt, u.updatedAt,
           k.id as krw_id, k.krw_name, pl.id as pelayanLevel_id, pl.levelName
    FROM users u
    LEFT JOIN krw k ON u.id_krw = k.id
    LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
    WHERE u.id = ?
  `);
  const row = stmt.get(id) as UserRow | undefined;
  if (!row) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  const data = {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    krw: row.krw_id ? { id: row.krw_id, name: row.krw_name! } : null,
    pelayanLevel: row.pelayanLevel_id
      ? { id: row.pelayanLevel_id, name: row.levelName! }
      : null,
  };

  return c.json({ success: true, data }, 200);
});

users.openapi(createUserRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || !["super_admin", "admin"].includes(currentUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const validatedData = c.req.valid("json");

  const krwExists = db
    .prepare("SELECT id FROM krw WHERE id = ?")
    .get(validatedData.id_krw);
  const levelExists = db
    .prepare("SELECT id FROM pelayanLevel WHERE id = ?")
    .get(validatedData.id_pelayanLevel);

  if (!krwExists) {
    return c.json({ success: false, message: "KRW not found" }, 400);
  }
  if (!levelExists) {
    return c.json({ success: false, message: "Pelayan level not found" }, 400);
  }

  const stmt = db.prepare(
    "INSERT INTO users (name, active, id_krw, id_pelayanLevel) VALUES (?, 1, ?, ?)",
  );
  const info = stmt.run(
    validatedData.name,
    validatedData.id_krw,
    validatedData.id_pelayanLevel,
  );

  const row = db
    .prepare(
      `
      SELECT u.id, u.name, u.active, u.id_krw, u.id_pelayanLevel, u.createdAt, u.updatedAt,
             k.id as krw_id, k.krw_name, pl.id as pelayanLevel_id, pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
      WHERE u.id = ?
    `,
    )
    .get(info.lastInsertRowid) as UserRow;

  const data = {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    krw: row.krw_id ? { id: row.krw_id, name: row.krw_name! } : null,
    pelayanLevel: row.pelayanLevel_id
      ? { id: row.pelayanLevel_id, name: row.levelName! }
      : null,
  };

  return c.json({ success: true, data }, 201);
});

users.openapi(updateUserRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || !["super_admin", "admin"].includes(currentUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const validatedData = c.req.valid("json");

  const userExists = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!userExists) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  if (validatedData.id_krw) {
    if (
      !db.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw)
    ) {
      return c.json({ success: false, message: "KRW not found" }, 400);
    }
  }
  if (validatedData.id_pelayanLevel) {
    if (
      !db
        .prepare("SELECT id FROM pelayanLevel WHERE id = ?")
        .get(validatedData.id_pelayanLevel)
    ) {
      return c.json(
        { success: false, message: "Pelayan level not found" },
        400,
      );
    }
  }

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (validatedData.name !== undefined) {
    updates.push("name = ?");
    values.push(validatedData.name);
  }
  if (validatedData.id_krw !== undefined) {
    updates.push("id_krw = ?");
    values.push(validatedData.id_krw);
  }
  if (validatedData.id_pelayanLevel !== undefined) {
    updates.push("id_pelayanLevel = ?");
    values.push(validatedData.id_pelayanLevel);
  }
  if (validatedData.active !== undefined) {
    updates.push("active = ?");
    values.push(validatedData.active ? 1 : 0);
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  const row = db
    .prepare(
      `
      SELECT u.id, u.name, u.active, u.id_krw, u.id_pelayanLevel, u.createdAt, u.updatedAt,
             k.id as krw_id, k.krw_name, pl.id as pelayanLevel_id, pl.levelName
      FROM users u
      LEFT JOIN krw k ON u.id_krw = k.id
      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
      WHERE u.id = ?
    `,
    )
    .get(id) as UserRow;

  const data = {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    krw: row.krw_id ? { id: row.krw_id, name: row.krw_name! } : null,
    pelayanLevel: row.pelayanLevel_id
      ? { id: row.pelayanLevel_id, name: row.levelName! }
      : null,
  };

  return c.json({ success: true, data }, 200);
});

users.openapi(deleteUserRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const hasAssignments = db
    .prepare(
      "SELECT COUNT(*) as count FROM ibadah_assignments WHERE id_users = ?",
    )
    .get(id) as { count: number };

  if (hasAssignments && hasAssignments.count > 0) {
    return c.json(
      {
        success: false,
        message: `Cannot delete user. User has ${hasAssignments.count} assignment(s).`,
      },
      400,
    );
  }

  const info = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (info.changes === 0) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  return c.json({ success: true, message: "User deleted successfully" }, 200);
});

users.openapi(toggleActiveRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || !["super_admin", "admin"].includes(currentUser.role)) {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }
  const { id } = c.req.valid("param");
  const targetUser = db
    .prepare("SELECT id, active FROM users WHERE id = ?")
    .get(id) as { id: number; active: number } | undefined;

  if (!targetUser) {
    return c.json({ success: false, message: "User not found" }, 404);
  }

  const updatedStatus = targetUser.active ? 0 : 1;
  db.prepare("UPDATE users SET active = ? WHERE id = ?").run(updatedStatus, id);

  return c.json(
    {
      success: true,
      message: `User ${updatedStatus ? "activated" : "deactivated"}`,
      newStatus: Boolean(updatedStatus),
    },
    200,
  );
});

export default users;
