import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

const ibadah = new OpenAPIHono<AppEnv>();

// Schemas
const IbadahSchema = z.object({
  id: z.number(),
  id_ibadahCategory: z.number(),
  stola: z.string().optional(),
  dress_code: z.string().optional(),
  service_date: z.string(),
  tata_ibadah_link: z.string().optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categoryName: z.string().optional(),
});

const CreateIbadahDTO = z.object({
  id_ibadahCategory: z.number().int().positive(),
  stola: z.string().optional().default(""),
  dress_code: z.string().optional().default(""),
  service_date: z.string().date(),
  tata_ibadah_link: z.string().default("").optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional(),
});

const UpdateIbadahDTO = z.object({
  id_ibadahCategory: z.number().int().positive().optional(),
  stola: z.string().optional(),
  dress_code: z.string().optional(),
  service_date: z.string().date().optional(),
  tata_ibadah_link: z.string().optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional(),
});

// Route Definitions
const listIbadahRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all worship services",
  tags: ["Ibadah"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      id_ibadahCategory: z.coerce.number().optional(),
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
            data: z.array(IbadahSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
          }),
        },
      },
      description: "Successfully retrieved services",
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

const getIbadahRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get worship service by ID",
  tags: ["Ibadah"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: IbadahSchema }),
        },
      },
      description: "Service found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Service not found",
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

const createIbadahRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new worship service",
  tags: ["Ibadah"],
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: { "application/json": { schema: CreateIbadahDTO } },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: IbadahSchema }),
        },
      },
      description: "Service created",
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

const updateIbadahRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update an existing worship service",
  tags: ["Ibadah"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: {
      content: { "application/json": { schema: UpdateIbadahDTO } },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: IbadahSchema }),
        },
      },
      description: "Service updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Service not found",
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

const deleteIbadahRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a worship service",
  tags: ["Ibadah"],
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
      description: "Service deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Service not found",
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
ibadah.openapi(listIbadahRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { search, id_ibadahCategory, skip, take } = c.req.valid("query");

  let query = `
    SELECT i.id, i.stola, i.dress_code, i.service_date, i.start_service_time, i.end_service_time, i.tata_ibadah_link, i.createdAt, i.updatedAt,
           ic.id as id_ibadahCategory, ic.categoryName
    FROM ibadah i
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`ic.categoryName LIKE ?`);
    values.push(`%${search}%`);
  }
  if (id_ibadahCategory !== undefined) {
    conditions.push(`i.id_ibadahCategory = ?`);
    values.push(id_ibadahCategory);
  }
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");

  query += " ORDER BY i.createdAt DESC LIMIT ? OFFSET ?";
  type TIbadah = z.infer<typeof IbadahSchema>;
  const data = db.prepare(query).all(...values, take, skip) as TIbadah[];

  let countQuery = `SELECT COUNT(*) as total FROM ibadah i LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id`;
  if (conditions.length > 0) countQuery += " WHERE " + conditions.join(" AND ");
  const countResult = db.prepare(countQuery).get(...values) as {
    total: number;
  };
  const total = countResult?.total ?? 0;

  return c.json({ success: true, data, total, skip, take }, 200);
});

ibadah.openapi(getIbadahRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  type TIbadah = z.infer<typeof IbadahSchema>;
  const row = db
    .prepare(
      `
    SELECT i.id, i.stola, i.dress_code, i.service_date, i.start_service_time, i.end_service_time, i.tata_ibadah_link, i.createdAt, i.updatedAt,
           i.id_ibadahCategory, ic.categoryName
    FROM ibadah i
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
    WHERE i.id = ?
  `,
    )
    .get(id) as TIbadah | undefined;

  if (!row) {
    return c.json({ success: false, error: "Not found" }, 404);
  }
  return c.json({ success: true, data: row }, 200);
});

ibadah.openapi(createIbadahRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const validated = c.req.valid("json");

  const exists = db
    .prepare("SELECT id FROM ibadahCategory WHERE id = ?")
    .get(validated.id_ibadahCategory);
  if (!exists) {
    return c.json({ success: false, error: "Invalid category" }, 400);
  }

  const stmt = db.prepare(`
    INSERT INTO ibadah (id_ibadahCategory, stola, dress_code, service_date, start_service_time, end_service_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    validated.id_ibadahCategory,
    validated.stola,
    validated.dress_code,
    validated.service_date,
    validated.start_service_time ?? null,
    validated.end_service_time ?? null,
  );
  type TIbadah = z.infer<typeof IbadahSchema>;
  const row = db
    .prepare(
      `
      SELECT i.*, ic.categoryName 
      FROM ibadah i 
      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id 
      WHERE i.id = ?
    `,
    )
    .get(info.lastInsertRowid) as TIbadah;
  return c.json({ success: true, data: row }, 201);
});

ibadah.openapi(updateIbadahRoute, async (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const validated = c.req.valid("json");

  const ALLOWED_FIELDS = [
    "id_ibadahCategory",
    "stola",
    "dress_code",
    "service_date",
    "tata_ibadah_link",
    "start_service_time",
    "end_service_time",
  ];
  const updates: string[] = [];
  const values: (string | number)[] = [];

  for (const [k, v] of Object.entries(validated)) {
    if (v !== undefined && ALLOWED_FIELDS.includes(k)) {
      updates.push(`${k} = ?`);
      values.push(v as string | number);
    }
  }

  if (updates.length > 0) {
    values.push(id);
    db.prepare(`UPDATE ibadah SET ${updates.join(", ")} WHERE id = ?`).run(
      ...values,
    );
  }

  type TIbadah = z.infer<typeof IbadahSchema>;
  const row = db
    .prepare(
      `
    SELECT i.*, ic.categoryName 
    FROM ibadah i 
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id 
    WHERE i.id = ?
  `,
    )
    .get(id) as TIbadah | undefined;

  if (!row) {
    return c.json({ success: false, error: "Not found" }, 404);
  }
  return c.json({ success: true, data: row }, 200);
});

ibadah.openapi(deleteIbadahRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role !== "super_admin") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { id } = c.req.valid("param");
  const info = db.prepare("DELETE FROM ibadah WHERE id = ?").run(id);
  if (info.changes === 0) {
    return c.json({ success: false, error: "Not found" }, 404);
  }
  return c.json({ success: true, message: "Deleted" }, 200);
});

export default ibadah;
