import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

const krw = new OpenAPIHono<AppEnv>();

// Schemas
const KrwSchema = z
  .object({
    id: z.number(),
    krw_name: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("KRW");

const CreateKrwDTO = z.object({
  krw_name: z.string().min(1, "KRW name is required"),
});

// Route Definitions
const listKrwRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all KRW (Kelompok Rukun Warga)",
  tags: ["KRW"],
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
            data: z.array(KrwSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
            totalPages: z.number(),
          }),
        },
      },
      description: "Successfully retrieved KRW data",
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

const getKrwRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get KRW by ID",
  tags: ["KRW"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: KrwSchema }),
        },
      },
      description: "KRW found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "KRW not found",
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

const createKrwRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new KRW",
  tags: ["KRW"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateKrwDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: KrwSchema }),
        },
      },
      description: "KRW created",
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

const updateKrwRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update a KRW",
  tags: ["KRW"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: CreateKrwDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: KrwSchema }),
        },
      },
      description: "KRW updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "KRW not found",
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

const deleteKrwRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a KRW",
  tags: ["KRW"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "KRW deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "KRW not found",
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
krw.openapi(listKrwRoute, (c) => {
  const { search, skip, take } = c.req.valid("query");

  let query = `SELECT id, krw_name, createdAt, updatedAt FROM krw`;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`krw_name LIKE ?`);
    values.push(`%${search}%`);
  }
  if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

  type TKrw = z.infer<typeof KrwSchema>;
  const data = db.prepare(query).all(...values, take, skip) as TKrw[];

  let countQuery = `SELECT COUNT(*) as total FROM krw`;
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

krw.openapi(getKrwRoute, (c) => {
  const { id } = c.req.valid("param");
  type TKrw = z.infer<typeof KrwSchema>;
  const krwData = db.prepare("SELECT * FROM krw WHERE id = ?").get(id) as
    | TKrw
    | undefined;
  if (!krwData) {
    return c.json({ success: false, error: "KRW not found" }, 404);
  }
  return c.json({ success: true, data: krwData }, 200);
});

krw.openapi(createKrwRoute, async (c) => {
  const { krw_name } = c.req.valid("json");
  try {
    const info = db
      .prepare("INSERT INTO krw (krw_name) VALUES (?)")
      .run(krw_name);
    type TKrw = z.infer<typeof KrwSchema>;
    const newKrw = db
      .prepare("SELECT * FROM krw WHERE id = ?")
      .get(info.lastInsertRowid) as TKrw;
    return c.json({ success: true, data: newKrw }, 201);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json({ success: false, error: "KRW name already exists" }, 400);
    }
    throw error;
  }
});

krw.openapi(updateKrwRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { krw_name } = c.req.valid("json");
  try {
    const info = db
      .prepare("UPDATE krw SET krw_name = ? WHERE id = ?")
      .run(krw_name, id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "KRW not found" }, 404);
    }
    type TKrw = z.infer<typeof KrwSchema>;
    const updatedKrw = db
      .prepare("SELECT * FROM krw WHERE id = ?")
      .get(id) as TKrw;
    return c.json({ success: true, data: updatedKrw }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json({ success: false, error: "KRW name already exists" }, 400);
    }
    throw error;
  }
});

krw.openapi(deleteKrwRoute, (c) => {
  const { id } = c.req.valid("param");
  try {
    const info = db.prepare("DELETE FROM krw WHERE id = ?").run(id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "KRW not found" }, 404);
    }
    return c.json({ success: true, message: "KRW deleted successfully" }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_FOREIGNKEY"
    ) {
      return c.json(
        {
          success: false,
          error: "Cannot delete KRW that is referenced by users",
        },
        400,
      );
    }
    throw error;
  }
});

export default krw;
