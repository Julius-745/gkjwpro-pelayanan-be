import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";

const ibadahCategory = new OpenAPIHono<AppEnv>();

// Schemas
const CategorySchema = z
  .object({
    id: z.number(),
    categoryName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("IbadahCategory");

const CreateCategoryDTO = z.object({
  categoryName: z.string().min(1, "Category name is required"),
});

// Route Definitions
const listCategoriesRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all worship categories",
  tags: ["Ibadah Category"],
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
            data: z.array(CategorySchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
            totalPages: z.number(),
          }),
        },
      },
      description: "Successfully retrieved categories",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const getCategoryRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get worship category by ID",
  tags: ["Ibadah Category"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: CategorySchema }),
        },
      },
      description: "Category found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Category not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const createCategoryRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new worship category",
  tags: ["Ibadah Category"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateCategoryDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: CategorySchema }),
        },
      },
      description: "Category created",
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

const updateCategoryRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update a worship category",
  tags: ["Ibadah Category"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: CreateCategoryDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: CategorySchema }),
        },
      },
      description: "Category updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Category not found",
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

const deleteCategoryRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete a worship category",
  tags: ["Ibadah Category"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Category deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Category not found",
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
ibadahCategory.openapi(listCategoriesRoute, (c) => {
  const { search, skip, take } = c.req.valid("query");

  let query = `SELECT id, categoryName, createdAt, updatedAt FROM ibadahCategory`;
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(`categoryName LIKE ?`);
    values.push(`%${search}%`);
  }
  if (conditions.length > 0) query += ` WHERE ` + conditions.join(" AND ");
  query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;

  type TCategory = z.infer<typeof CategorySchema>;
  const data = db.prepare(query).all(...values, take, skip) as TCategory[];

  let countQuery = `SELECT COUNT(*) as total FROM ibadahCategory`;
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

ibadahCategory.openapi(getCategoryRoute, (c) => {
  const { id } = c.req.valid("param");
  type TCategory = z.infer<typeof CategorySchema>;
  const category = db
    .prepare("SELECT * FROM ibadahCategory WHERE id = ?")
    .get(id) as TCategory | undefined;
  if (!category) {
    return c.json({ success: false, error: "Ibadah category not found" }, 404);
  }
  return c.json({ success: true, data: category }, 200);
});

ibadahCategory.openapi(createCategoryRoute, async (c) => {
  const { categoryName } = c.req.valid("json");
  try {
    const info = db
      .prepare("INSERT INTO ibadahCategory (categoryName) VALUES (?)")
      .run(categoryName);
    type TCategory = z.infer<typeof CategorySchema>;
    const newCategory = db
      .prepare("SELECT * FROM ibadahCategory WHERE id = ?")
      .get(info.lastInsertRowid) as TCategory;
    return c.json({ success: true, data: newCategory }, 201);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Category name already exists" },
        400,
      );
    }
    throw error;
  }
});

ibadahCategory.openapi(updateCategoryRoute, async (c) => {
  const { id } = c.req.valid("param");
  const { categoryName } = c.req.valid("json");
  try {
    const info = db
      .prepare("UPDATE ibadahCategory SET categoryName = ? WHERE id = ?")
      .run(categoryName, id);
    if (info.changes === 0) {
      return c.json(
        { success: false, error: "Ibadah category not found" },
        404,
      );
    }
    type TCategory = z.infer<typeof CategorySchema>;
    const updatedCategory = db
      .prepare("SELECT * FROM ibadahCategory WHERE id = ?")
      .get(id) as TCategory;
    return c.json({ success: true, data: updatedCategory }, 200);
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "SQLITE_CONSTRAINT_UNIQUE"
    ) {
      return c.json(
        { success: false, error: "Category name already exists" },
        400,
      );
    }
    throw error;
  }
});

ibadahCategory.openapi(deleteCategoryRoute, (c) => {
  const { id } = c.req.valid("param");
  try {
    const info = db.prepare("DELETE FROM ibadahCategory WHERE id = ?").run(id);
    if (info.changes === 0) {
      return c.json(
        { success: false, error: "Ibadah category not found" },
        404,
      );
    }
    return c.json(
      {
        success: true,
        message: "Ibadah category deleted successfully",
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
          error: "Cannot delete category that is referenced by users or ibadah",
        },
        400,
      );
    }
    throw error;
  }
});

export default ibadahCategory;
