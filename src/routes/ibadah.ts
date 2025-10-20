// routes/ibadah.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";

const ibadah = new Hono();
ibadah.use("*", authenticateToken);

// Schema for create/update
const createIbadahSchema = z.object({
  id_ibadahCategory: z.number().int().positive(),
  stola: z.string().optional().default(''),
  dress_code: z.string().optional().default(''),
  service_date: z.string().date(),
  tata_ibadah_link: z.string().default('').optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional()
});

const updateIbadahSchema = z.object({
  id_ibadahCategory: z.number().int().positive().optional(),
  stola: z.string().optional(),
  dress_code: z.string().optional(),
  service_date: z.string().date().optional(),
  tata_ibadah_link: z.string().optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  id_ibadahCategory: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
});

// Get all ibadah with pagination, search, filter
ibadah.get("/", requireRole(["super_admin", "admin"]), (c) => {
  const queryResult = querySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ success: false, error: queryResult.error.errors }, 400);
  }

  const { search, id_ibadahCategory, skip, take } = queryResult.data;

  let query = `
    SELECT 
    i.id, 
    i.stola,
    i.dress_code,
    i.service_date, 
    i.start_service_time, 
    i.end_service_time, 
    i.tata_ibadah_link,
    i.createdAt, 
    i.updatedAt,
    ic.id as id_ibadahCategory,
    ic.categoryName
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
  const stmt = db.prepare(query);
  const data = stmt.all(...values, take, skip);

  // count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM ibadah i
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `;
  if (conditions.length > 0) countQuery += " WHERE " + conditions.join(" AND ");
  const countStmt = db.prepare(countQuery);
  const row = countStmt.get(...values) as { total: number } | undefined;
  const total = row?.total ?? 0;

  return c.json({ success: true, data, total, skip, take });
});

// Get single ibadah
ibadah.get("/:id", requireRole(["super_admin", "admin"]), (c) => {
  const id = Number(c.req.param("id"));
  const stmt = db.prepare(`
    SELECT i.id, i.stola, i.dress_code, i.service_date, i.start_service_time, i.end_service_time, i.createdAt, i.updatedAt,
           ic.categoryName
    FROM ibadah i
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
    WHERE i.id = ?
  `);
  const data = stmt.get(id);
  if (!data) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data });
});

// Create ibadah
ibadah.post("/", requireRole(["super_admin", "admin"]), async (c) => {
  const body = await c.req.json();
  const validated = createIbadahSchema.parse(body);

  const exists = db.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validated.id_ibadahCategory);
  if (!exists) return c.json({ success: false, error: "Invalid category" }, 400);

  const stmt = db.prepare(`
    INSERT INTO ibadah (id_ibadahCategory, stola, dress_code, service_date, start_service_time, end_service_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    validated.id_ibadahCategory, 
    validated.stola, 
    validated.dress_code, 
    validated.service_date, 
    validated.start_service_time, 
    validated.end_service_time
  );
  const newData = db.prepare("SELECT * FROM ibadah WHERE id = ?").get(info.lastInsertRowid);

  return c.json({ success: true, data: newData }, 201);
});

// Update ibadah
ibadah.patch("/:id", requireRole(["super_admin", "admin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const validated = updateIbadahSchema.parse(body);

  const updates: string[] = [];
  const values: any[] = [];
  for (const [k, v] of Object.entries(validated)) {
    if (v !== undefined) {
      updates.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (updates.length === 0) return c.json({ success: false, error: "No fields" }, 400);

  values.push(id);
  db.prepare(`UPDATE ibadah SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM ibadah WHERE id = ?").get(id);

  return c.json({ success: true, data: updated });
});

// Delete ibadah
ibadah.delete("/:id", requireRole(["super_admin"]), (c) => {
  const id = Number(c.req.param("id"));
  const info = db.prepare("DELETE FROM ibadah WHERE id = ?").run(id);
  if (info.changes === 0) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, message: "Deleted" });
});

export default ibadah;