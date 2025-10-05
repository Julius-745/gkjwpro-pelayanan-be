// routes/ibadahAssignments.ts
import { Hono } from "hono";
import db from "../db";
import { z } from "zod";
import { requireRole, authenticateToken } from "../middleware/authMiddleware";
import XLSX from "xlsx";

const assignments = new Hono();
assignments.use("*", authenticateToken);

const createSchema = z.object({
  id_ibadah: z.number().int().positive(),
  id_users: z.number().int().positive(),
  id_pelayanPosition: z.number().int().positive()
});

const updateSchema = z.object({
  id_ibadah: z.number().int().positive().optional(),
  id_users: z.number().int().positive().optional(),
  id_pelayanPosition: z.number().int().positive().optional()
});

const querySchema = z.object({
  search: z.string().optional(),
  id_ibadah: z.coerce.number().optional(),
  id_pelayanPosition: z.coerce.number().optional(),
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(100).default(10)
});

// Get all with filters
assignments.get("/", requireRole(["admin"]), (c) => {
  const queryResult = querySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ success: false, error: queryResult.error.errors }, 400);
  }

  const { search, id_ibadah, id_pelayanPosition, skip, take } = queryResult.data;

  let query = `
    SELECT ia.id, ia.id_ibadah, ia.id_users, ia.id_pelayanPosition, ia.createdAt, ia.updatedAt,
          u.name as userName, pp.positionName, i.service_date, i.start_service_time, i.end_service_time, ic.categoryName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `;

  const conditions: string[] = [];
  const values: any[] = [];

  if (search) {
    conditions.push("(u.name LIKE ? OR pp.positionName LIKE ? OR ic.categoryName LIKE ?)");
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (id_ibadah !== undefined) {
    conditions.push("ia.id_ibadah = ?");
    values.push(id_ibadah);
  }
  if (id_pelayanPosition !== undefined) {
    conditions.push("ia.id_pelayanPosition = ?");
    values.push(id_pelayanPosition);
  }
  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");

  query += " ORDER BY ia.createdAt DESC LIMIT ? OFFSET ?";
  const data = db.prepare(query).all(...values, take, skip);

  // count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
    `;
    if (conditions.length > 0) {
    countQuery += " WHERE " + conditions.join(" AND ");
    }

    const row = db.prepare(countQuery).get(...values) as { total: number } | undefined;
    const total = row?.total ?? 0;

  return c.json({ success: true, data, total, skip, take });
});

assignments.get("/calendar", requireRole(["admin"]), (c) => {
  const rows = db.prepare(`
    SELECT ia.id, i.service_date, i.start_service_time, i.end_service_time, u.name as userName,
          pp.positionName, ic.categoryName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `).all();

  // Group by service_date + time + category
  const grouped: Record<string, { categoryName: string; assignments: any[] }> = {};

  rows.forEach((row: any) => {
    const key = `${row.service_date}T${row.start_service_time ?? "00:00"} - ${row.start_service_time ?? "00:00"} -${row.categoryName}`;
    if (!grouped[key]) {
      grouped[key] = { categoryName: row.categoryName, assignments: [] };
    }
    grouped[key].assignments.push({
      userName: row.userName,
      positionName: row.positionName,
    });
  });

  const events = Object.entries(grouped).map(([dateTime, group], idx) => {
    const [date] = dateTime.split("-");
    const start = new Date(date as string);
    return {
      id: `assignment-${idx}`,
      start,
      end: start,
      title: group.categoryName,
      meta: {
        assignments: group.assignments,
      },
    };
  });

  return c.json({ success: true, data: events });
});

assignments.get("/export/excel", requireRole(["admin"]), (c) => {
  try {
    // Single query to get all needed data
    const rawData = db.prepare(`
      SELECT 
        i.service_date,
        i.start_service_time,
        ic.categoryName,
        i.stola,
        i.dress_code,
        pp.positionName,
        u.name as userName,
        pp.id as position_id,
        ic.id as category_id
      FROM ibadah_assignments ia
      INNER JOIN users u ON ia.id_users = u.id
      INNER JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
      INNER JOIN ibadah i ON ia.id_ibadah = i.id
      INNER JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
      ORDER BY i.service_date ASC, i.start_service_time ASC, pp.positionName ASC
    `).all();

    // Process data efficiently
    const dateColumns: string[] = [];
    const timeColumns: string[] = [];
    const positionSet = new Set<string>();
    const dataMatrix = new Map<string, Map<string, string>>();

    // Build unique dates, times, and positions
    rawData.forEach((row: any) => {
      const dateKey = row.service_date;
      const timeKey = `${row.start_service_time || '00:00'}-${row.categoryName}`;
      const columnKey = `${dateKey}|${timeKey}`;
      
      if (!dateColumns.includes(dateKey) || !timeColumns.includes(timeKey)) {
        dateColumns.push(dateKey);
        timeColumns.push(row.categoryName);
      }
      
      positionSet.add(row.positionName);
      
      if (!dataMatrix.has(row.positionName)) {
        dataMatrix.set(row.positionName, new Map());
      }
      
      dataMatrix.get(row.positionName)!.set(columnKey, row.userName);
    });

    // Remove duplicates and sort
    const uniqueDateTimes = [...new Set(rawData.map((row: any) => 
      `${row.service_date}|${row.start_service_time || '00:00'}-${row.categoryName}`
    ))].sort();

    const sortedPositions = Array.from(positionSet).sort();

    // Build Excel data
    const headers = ['Pelayan/Position', ...uniqueDateTimes.map(dt => dt.split('|')[0])];
    const timeHeaders = ['Waktu', ...uniqueDateTimes.map(dt => dt.split('|')[1].split('-')[1])];
    
    const excelData = [headers, timeHeaders];

    // Add position rows
    sortedPositions.forEach(position => {
      const row = [position];
      uniqueDateTimes.forEach(dateTime => {
        const value = dataMatrix.get(position)?.get(dateTime) || '';
        row.push(value);
      });
      excelData.push(row);
    });

    // Add footer rows
    excelData.push(['Dresscode', ...Array(uniqueDateTimes.length).fill('Batik')]);
    excelData.push(['Stola', ...Array(uniqueDateTimes.length).fill('Hijau')]);

    // Create and return Excel file
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Position column
      ...Array(uniqueDateTimes.length).fill({ wch: 15 })
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Jadwal Pelayanan');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const filename = `Jadwal_Pelayanan_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    c.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    
    return c.body(buffer);
    
  } catch (error) {
    console.error('Export error:', error);
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});


// Get single
assignments.get("/:id", requireRole(["admin"]), (c) => {
  const id = Number(c.req.param("id"));
  const stmt = db.prepare(`
    SELECT ia.*, u.name as userName, pp.positionName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    WHERE ia.id = ?
  `);
  const data = stmt.get(id);
  if (!data) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, data });
});

// Create assignment
assignments.post("/", requireRole(["admin"]), async (c) => {
  const body = await c.req.json();
  const validated = createSchema.parse(body);

  // validate foreign keys
  if (!db.prepare("SELECT id FROM ibadah WHERE id = ?").get(validated.id_ibadah))
    return c.json({ success: false, error: "Ibadah not found" }, 400);
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(validated.id_users))
    return c.json({ success: false, error: "User not found" }, 400);
  if (!db.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validated.id_pelayanPosition))
    return c.json({ success: false, error: "Position not found" }, 400);

  const info = db.prepare(`
    INSERT INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition)
    VALUES (?, ?, ?)
  `).run(validated.id_ibadah, validated.id_users, validated.id_pelayanPosition);

  const newData = db.prepare("SELECT * FROM ibadah_assignments WHERE id = ?").get(info.lastInsertRowid);
  return c.json({ success: true, data: newData }, 201);
});

// Update assignment
assignments.patch("/:id", requireRole(["admin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const validated = updateSchema.parse(body);

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
  db.prepare(`UPDATE ibadah_assignments SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  const updated = db.prepare("SELECT * FROM ibadah_assignments WHERE id = ?").get(id);

  return c.json({ success: true, data: updated });
});

// Delete
assignments.delete("/:id", requireRole(["admin"]), (c) => {
  const id = Number(c.req.param("id"));
  const info = db.prepare("DELETE FROM ibadah_assignments WHERE id = ?").run(id);
  if (info.changes === 0) return c.json({ success: false, error: "Not found" }, 404);
  return c.json({ success: true, message: "Deleted" });
});


export default assignments;
