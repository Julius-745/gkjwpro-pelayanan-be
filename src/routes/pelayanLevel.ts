import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

const pelayanLevel = new OpenAPIHono<AppEnv>();

// Schemas
const LevelSchema = z
  .object({
    id: z.number(),
    levelName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("PelayanLevel");

const CreateLevelDTO = z.object({
  levelName: z.string().min(1, "Level name is required"),
});

// Route Definitions
const listLevelsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all server levels",
  tags: ["Pelayan Level"],
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
            data: z.array(LevelSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
            totalPages: z.number(),
          }),
        },
      },
      description: "Successfully retrieved levels",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const getLevelRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get server level by ID",
  tags: ["Pelayan Level"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: LevelSchema }),
        },
      },
      description: "Level found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Level not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const createLevelRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new server level",
  tags: ["Pelayan Level"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateLevelDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: LevelSchema }),
        },
      },
      description: "Level created",
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

const updateLevelRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update a server level",
  tags: ["Pelayan Level"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: CreateLevelDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: LevelSchema }),
        },
      },
      description: "Level updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Level not found",
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

const deleteLevelRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a server level",
  tags: ["Pelayan Level"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Level deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Level not found",
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
pelayanLevel.openapi(listLevelsRoute, (c) => {
  const { search, skip, take } = c.req.valid("query");

  let query = `SELECT id, levelName, createdAt, updatedAt FROM pelayanLevel`;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`levelName LIKE ?`);
    values.push(`%${search}%`);
  }
  if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

  type TLevel = z.infer<typeof LevelSchema>;
  const data = db.prepare(query).all(...values, take, skip) as TLevel[];

  let countQuery = `SELECT COUNT(*) as total FROM pelayanLevel`;
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

pelayanLevel.openapi(getLevelRoute, (c) => {
  const { id } = c.req.valid("param");
  type TLevel = z.infer<typeof LevelSchema>;
  const level = db
    .prepare("SELECT * FROM pelayanLevel WHERE id = ?")
    .get(id) as TLevel | undefined;
  if (!level) {
    return c.json({ success: false, error: "Level not found" }, 404);
  }
  return c.json({ success: true, data: level }, 200);
});

pelayanLevel.openapi(createLevelRoute, async (c) => {
  const { levelName } = c.req.valid("json");
  try {
    const info = db
      .prepare("INSERT INTO pelayanLevel (levelName) VALUES (?)")
      .run(levelName);
    type TLevel = z.infer<typeof LevelSchema>;
    const newLevel = db
      .prepare("SELECT * FROM pelayanLevel WHERE id = ?")
      .get(info.lastInsertRowid) as TLevel;
    return c.json({ success: true, data: newLevel }, 201);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Level name already exists" },
        400,
      );
    }
    throw error;
  }
});

pelayanLevel.openapi(updateLevelRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { levelName } = c.req.valid("json");
  try {
    const info = db
      .prepare("UPDATE pelayanLevel SET levelName = ? WHERE id = ?")
      .run(levelName, id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "Level not found" }, 404);
    }
    type TLevel = z.infer<typeof LevelSchema>;
    const updatedLevel = db
      .prepare("SELECT * FROM pelayanLevel WHERE id = ?")
      .get(id) as TLevel;
    return c.json({ success: true, data: updatedLevel }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Level name already exists" },
        400,
      );
    }
    throw error;
  }
});

pelayanLevel.openapi(deleteLevelRoute, (c) => {
  const { id } = c.req.valid("param");
  try {
    const info = db.prepare("DELETE FROM pelayanLevel WHERE id = ?").run(id);
    if (info.changes === 0) {
      return c.json({ success: false, error: "Level not found" }, 404);
    }
    return c.json(
      {
        success: true,
        message: "Pelayan level deleted successfully",
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
          error: "Cannot delete level that is referenced by users",
        },
        400,
      );
    }
    throw error;
  }
});

export default pelayanLevel;
