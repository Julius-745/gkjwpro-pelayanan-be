// routes/ibadahCategory.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";

const ibadahCategory = new Hono();

const createCategorySchema = z.object({
  categoryName: z.string().min(1, "Category name is required")
});

ibadahCategory.get("/", (c) => {
  try {
    const stmt = db.prepare("SELECT * FROM ibadahCategory ORDER BY createdAt DESC");
    const data = stmt.all();
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch ibadah categories" }, 500);
  }
});

ibadahCategory.get("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const stmt = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?");
    const category = stmt.get(id);

    if (!category) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    return c.json({ success: true, data: category });
  } catch (error) {
    return c.json({ success: false, error: error || "Failed to fetch ibadah category" }, 500);
  }
});

ibadahCategory.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const validatedData = createCategorySchema.parse(body);

    const stmt = db.prepare("INSERT INTO ibadahCategory (categoryName) VALUES (?)");
    const info = stmt.run(validatedData.categoryName);

    const newCategory = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?").get(info.lastInsertRowid);
    return c.json({ success: true, data: newCategory }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Category name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to create ibadah category" }, 500);
  }
});

ibadahCategory.patch("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const body = await c.req.json();
    const validatedData = createCategorySchema.parse(body);

    const stmt = db.prepare("UPDATE ibadahCategory SET categoryName = ? WHERE id = ?");
    const info = stmt.run(validatedData.categoryName, id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    const updatedCategory = db.prepare("SELECT * FROM ibadahCategory WHERE id = ?").get(id);
    return c.json({ success: true, data: updatedCategory });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ success: false, error: error.errors }, 400);
    }
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return c.json({ success: false, error: "Category name already exists" }, 400);
    }
    return c.json({ success: false, error: "Failed to update ibadah category" }, 500);
  }
});

ibadahCategory.delete("/:id", (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, error: "Invalid category ID" }, 400);
    }

    const stmt = db.prepare("DELETE FROM ibadahCategory WHERE id = ?");
    const info = stmt.run(id);

    if (info.changes === 0) {
      return c.json({ success: false, error: "Ibadah category not found" }, 404);
    }

    return c.json({ success: true, message: "Ibadah category deleted successfully" });
  } catch (error) {
    /* @ts-expect-error: "type error" */
    if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
      return c.json({ success: false, error: "Cannot delete category that is referenced by users or ibadah" }, 400);
    }
    return c.json({ success: false, error: "Failed to delete ibadah category" }, 500);
  }
});

export default ibadahCategory;