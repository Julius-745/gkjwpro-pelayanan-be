import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

const pelayananPosition = new OpenAPIHono<AppEnv>();

// Schemas
const PositionSchema = z
  .object({
    id: z.number(),
    positionName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("PelayanPosition");

const CreatePositionDTO = z.object({
  positionName: z.string().min(1, "Position name is required"),
});

// Route Definitions
const listPositionsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all server positions",
  tags: ["Pelayan Position"],
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
            data: z.array(PositionSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
            totalPages: z.number(),
          }),
        },
      },
      description: "Successfully retrieved positions",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const getPositionRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get server position by ID",
  tags: ["Pelayan Position"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: PositionSchema }),
        },
      },
      description: "Position found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Position not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const createPositionRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new server position",
  tags: ["Pelayan Position"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreatePositionDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: PositionSchema }),
        },
      },
      description: "Position created",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Invalid input or duplicate",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const updatePositionRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update a server position",
  tags: ["Pelayan Position"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: CreatePositionDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: PositionSchema }),
        },
      },
      description: "Position updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Position not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Invalid input",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const deletePositionRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a server position",
  tags: ["Pelayan Position"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Position deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Position not found",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Conflict",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

// Implementation
pelayananPosition.openapi(listPositionsRoute, (c) => {
  const { search, skip, take } = c.req.valid("query");

  let query = `SELECT id, positionName, createdAt, updatedAt FROM pelayanPosition`;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`positionName LIKE ?`);
    values.push(`%${search}%`);
  }
  if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

  type TPosition = z.infer<typeof PositionSchema>;
  const data = db.prepare(query).all(...values, take, skip) as TPosition[];

  let countQuery = `SELECT COUNT(*) as total FROM pelayanPosition`;
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

pelayananPosition.openapi(getPositionRoute, (c) => {
  const { id } = c.req.valid("param");
  type TPosition = z.infer<typeof PositionSchema>;
  const position = db
    .prepare("SELECT * FROM pelayanPosition WHERE id = ?")
    .get(id) as TPosition | undefined;
  if (!position) {
    return c.json({ success: false, error: "Position not found" }, 404);
  }
  return c.json({ success: true, data: position }, 200);
});

pelayananPosition.openapi(createPositionRoute, async (c) => {
  const { positionName } = c.req.valid("json");
  try {
    const info = db
      .prepare("INSERT INTO pelayanPosition (positionName) VALUES (?)")
      .run(positionName);
    type TPosition = z.infer<typeof PositionSchema>;
    const newPosition = db
      .prepare("SELECT * FROM pelayanPosition WHERE id = ?")
      .get(info.lastInsertRowid) as TPosition;
    return c.json({ success: true, data: newPosition }, 201);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Position name already exists" },
        400,
      );
    }
    throw error;
  }
});

pelayananPosition.openapi(updatePositionRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { positionName } = c.req.valid("json");
  try {
    const info = db
      .prepare("UPDATE pelayanPosition SET positionName = ? WHERE id = ?")
      .run(positionName, id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "Position not found" }, 404);
    }
    type TPosition = z.infer<typeof PositionSchema>;
    const updatedPosition = db
      .prepare("SELECT * FROM pelayanPosition WHERE id = ?")
      .get(id) as TPosition;
    return c.json({ success: true, data: updatedPosition }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Position name already exists" },
        400,
      );
    }
    throw error;
  }
});

pelayananPosition.openapi(deletePositionRoute, (c) => {
  const { id } = c.req.valid("param");
  try {
    const info = db.prepare("DELETE FROM pelayanPosition WHERE id = ?").run(id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "Position not found" }, 404);
    }
    return c.json(
      {
        success: true,
        message: "Pelayan position deleted successfully",
      },
      200,
    );
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
          error: "Cannot delete position that is referenced by assignments",
        },
        400,
      );
    }
    throw error;
  }
});

export default pelayananPosition;
