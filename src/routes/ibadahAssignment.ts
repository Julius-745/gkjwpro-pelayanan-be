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
  id_pelayanPosition: z.number().int().positive(),
  id_ibadahCategory: z.number().int().positive().optional()
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

function checkUserDateConflict(
  id_ibadah: number,
  id_users: number,
  excludeAssignmentId?: number
): { hasConflict: boolean; message?: string; conflictingIbadah?: any } {
  const query = `
    SELECT ia.id, i.service_date, i.start_service_time, i.end_service_time, 
           ic.categoryName, pp.positionName, i2.service_date as new_service_date
    FROM ibadah_assignments ia
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i2 ON i2.id = ?
    WHERE ia.id_users = ? 
      AND i.service_date = i2.service_date
      AND ia.id_ibadah != ?
      ${excludeAssignmentId ? 'AND ia.id != ?' : ''}
  `;
  
  const params = excludeAssignmentId
    ? [id_ibadah, id_users, id_ibadah, excludeAssignmentId]
    : [id_ibadah, id_users, id_ibadah];
  
  const existing = db.prepare(query).get(...params) as any;
  
  if (existing) {
    return {
      hasConflict: true,
      message: `This user is already assigned to "${existing.categoryName}" (${existing.start_service_time} - ${existing.end_service_time}) as "${existing.positionName}" on ${existing.service_date}`,
      conflictingIbadah: existing
    };
  }
  
  return { hasConflict: false };
}

// Helper function to check if position is already assigned
function checkPositionConflict(
  id_ibadah: number, 
  id_pelayanPosition: number, 
  excludeAssignmentId?: number
): { conflict: boolean; message?: string; existingUser?: string } {
  const query = `
    SELECT ia.id, u.name as userName, pp.positionName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    WHERE ia.id_ibadah = ? AND ia.id_pelayanPosition = ?
    ${excludeAssignmentId ? 'AND ia.id != ?' : ''}
  `;
  
  const params = excludeAssignmentId 
    ? [id_ibadah, id_pelayanPosition, excludeAssignmentId]
    : [id_ibadah, id_pelayanPosition];
  
  const existing = db.prepare(query).get(...params) as any;
  
  if (existing) {
    return {
      conflict: true,
      message: `Position "${existing.positionName}" is already assigned to ${existing.userName} for this service`,
      existingUser: existing.userName
    };
  }
  
  return { conflict: false };
}

// Helper function to check if user is already assigned to this ibadah
function checkUserAlreadyAssigned(
  id_ibadah: number,
  id_users: number,
  id_ibadahCategory?: number,
  excludeAssignmentId?: number
): { alreadyAssigned: boolean; message?: string; existingPosition?: string } {
  // If no category provided, skip category check
  if (!id_ibadahCategory) {
    const query = `
      SELECT ia.id, pp.positionName
      FROM ibadah_assignments ia
      LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
      WHERE ia.id_ibadah = ? AND ia.id_users = ?
      ${excludeAssignmentId ? 'AND ia.id != ?' : ''}
    `;
    
    const params = excludeAssignmentId
      ? [id_ibadah, id_users, excludeAssignmentId]
      : [id_ibadah, id_users];
    
    const existing = db.prepare(query).get(...params) as any;
    
    if (existing) {
      return {
        alreadyAssigned: true,
        message: `This user is already assigned as "${existing.positionName}" for this service`,
        existingPosition: existing.positionName
      };
    }
    
    return { alreadyAssigned: false };
  }

  // With category check
  const query = `
    SELECT ia.id, pp.positionName, i.id_ibadahCategory
    FROM ibadah_assignments ia
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    WHERE ia.id_ibadah = ? AND ia.id_users = ? AND i.id_ibadahCategory = ?
    ${excludeAssignmentId ? 'AND ia.id != ?' : ''}
  `;
  
  const params = excludeAssignmentId
    ? [id_ibadah, id_users, id_ibadahCategory, excludeAssignmentId]
    : [id_ibadah, id_users, id_ibadahCategory];
  
  const existing = db.prepare(query).get(...params) as any;
  
  if (existing) {
    return {
      alreadyAssigned: true,
      message: `This user is already assigned as "${existing.positionName}" for this service and category`,
      existingPosition: existing.positionName
    };
  }
  
  return { alreadyAssigned: false };
}

// Get all with filters
assignments.get("/", requireRole(["admin"]), (c) => {
  const queryResult = querySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return c.json({ success: false, error: queryResult.error.errors }, 400);
  }

  const { search, id_ibadah, id_pelayanPosition, skip, take } = queryResult.data;

  let query = `
    SELECT ia.id, ia.id_ibadah, ia.id_users, ia.id_pelayanPosition, ia.createdAt, ia.updatedAt,
          u.name as userName, pp.positionName, i.tata_ibadah_link, i.service_date, i.start_service_time, i.end_service_time, ic.categoryName
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
    SELECT ia.id, i.service_date, i.tata_ibadah_link, i.start_service_time, i.end_service_time, 
           u.name as userName, pp.positionName, ic.categoryName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `).all();

  // Group by date + time + category
  const grouped: Record<string, { categoryName: string; assignments: any[], tata_ibadah_link: string }> = {};

  rows.forEach((row: any) => {
    const key = `${row.service_date}T${row.start_service_time ?? "00:00"} - ${row.end_service_time ?? "00:00"} - ${row.categoryName}`;
    if (!grouped[key]) {
      grouped[key] = { categoryName: row.categoryName, tata_ibadah_link: row.tata_ibadah_link,assignments: [] };
    }
    grouped[key].assignments.push({
      userName: row.userName,
      positionName: row.positionName,
    });
  });

  // Convert grouped data into calendar events
  const events = Object.entries(grouped).map(([key, group], idx) => {
    const [datePart, timePartRaw] = key.split("T");
    const timePart = timePartRaw ?? "00:00 - 00:00";
    const [startTimeRaw, endTimeRaw] = timePart.split(" - ");
    const startTime = startTimeRaw?.trim() || "00:00";
    const endTime = endTimeRaw?.trim().replace(/ - .*/, "") || "00:00";

    const start = new Date(`${datePart}T${startTime}`);
    const end = new Date(`${datePart}T${endTime}`);

    return {
      id: `assignment-${idx}`,
      start,
      end,
      title: group.categoryName,
      tata_ibadah_link: group.tata_ibadah_link,
      meta: {
        assignments: group.assignments,
      },
    };
  });

  return c.json({ success: true, data: events });
});



assignments.get("/export/excel", requireRole(["admin"]), (c) => {
  try {
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

    const dateColumns: string[] = [];
    const timeColumns: string[] = [];
    const positionSet = new Set<string>();
    const dataMatrix = new Map<string, Map<string, string>>();

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

    const uniqueDateTimes = [...new Set(rawData.map((row: any) => 
      `${row.service_date}|${row.start_service_time || '00:00'}-${row.categoryName}`
    ))].sort();

    const sortedPositions = Array.from(positionSet).sort();

    const headers = ['Pelayan/Position', ...uniqueDateTimes.map(dt => dt.split('|')[0])];
    const timeHeaders = ['Waktu', ...uniqueDateTimes.map(dt => dt.split('|')[1].split('-')[1])];
    
    const excelData = [headers, timeHeaders];

    sortedPositions.forEach(position => {
      const row = [position];
      uniqueDateTimes.forEach(dateTime => {
        const value = dataMatrix.get(position)?.get(dateTime) || '';
        row.push(value);
      });
      excelData.push(row);
    });

    excelData.push(['Dresscode', ...Array(uniqueDateTimes.length).fill('Batik')]);
    excelData.push(['Stola', ...Array(uniqueDateTimes.length).fill('Hijau')]);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    
    worksheet['!cols'] = [
      { wch: 25 },
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

// Create assignment with conflict check
assignments.post("/", requireRole(["admin"]), async (c) => {
  const body = await c.req.json();
  const validated = createSchema.parse(body);

  // Validate foreign keys and get ibadah details
  const ibadah = db.prepare("SELECT id, id_ibadahCategory FROM ibadah WHERE id = ?").get(validated.id_ibadah) as any;
  if (!ibadah)
    return c.json({ success: false, error: "Ibadah not found" }, 400);
  
  if (!db.prepare("SELECT id FROM users WHERE id = ?").get(validated.id_users))
    return c.json({ success: false, error: "User not found" }, 400);
  
  if (!db.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validated.id_pelayanPosition))
    return c.json({ success: false, error: "Position not found" }, 400);

  // Use the category from the ibadah record, not from the request
  const categoryId = ibadah.id_ibadahCategory;

  const dateConflictCheck = checkUserDateConflict(
    validated.id_ibadah,
    validated.id_users
  );

  if (dateConflictCheck.hasConflict) {
    return c.json({
      success: false,
      error: dateConflictCheck.message,
      conflictingIbadah: dateConflictCheck.conflictingIbadah,
      type: 'date_conflict'
    }, 409);
  } 

  // Check if user is already assigned to this ibadah with the same category
  const userCheck = checkUserAlreadyAssigned(
    validated.id_ibadah,
    validated.id_users,
    categoryId
  );

  if (userCheck.alreadyAssigned) {
    return c.json({
      success: false,
      error: userCheck.message,
      existingPosition: userCheck.existingPosition,
      type: 'user_already_assigned'
    }, 409);
  }

  // Check for position conflict
  const conflictCheck = checkPositionConflict(
    validated.id_ibadah, 
    validated.id_pelayanPosition,
    categoryId
  );

  if (conflictCheck.conflict) {
    return c.json({ 
      success: false, 
      error: conflictCheck.message,
      conflictWith: conflictCheck.existingUser,
      type: 'position_conflict'
    }, 409);
  }

  // Check if data has changed from FE (if changeCheck provided)
  if (body.changeCheck) {
    const existing = db.prepare(`
      SELECT ia.*, u.name as userName, pp.positionName
      FROM ibadah_assignments ia
      LEFT JOIN users u ON ia.id_users = u.id
      LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
      WHERE ia.id_ibadah = ? AND ia.id_pelayanPosition = ?
    `).get(validated.id_ibadah, validated.id_pelayanPosition) as any;

    if (existing && body.changeCheck.expectedUser && existing.id_users !== body.changeCheck.expectedUser) {
      return c.json({
        success: false,
        error: "Data has changed. Please refresh and try again.",
        hasChanged: true,
        currentData: existing,
        type: 'data_changed'
      }, 409);
    }
  }

  const info = db.prepare(`
    INSERT INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition)
    VALUES (?, ?, ?)
  `).run(validated.id_ibadah, validated.id_users, validated.id_pelayanPosition);

  const newData = db.prepare("SELECT * FROM ibadah_assignments WHERE id = ?").get(info.lastInsertRowid);
  return c.json({ success: true, data: newData }, 201);
});

// Update assignment with conflict check
assignments.patch("/:id", requireRole(["admin"]), async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const validated = updateSchema.parse(body);

  // Get current assignment
  const current = db.prepare(`
    SELECT ia.*, u.name as userName, pp.positionName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    WHERE ia.id = ?
  `).get(id) as any;
  
  if (!current) {
    return c.json({ success: false, error: "Assignment not found" }, 404);
  }

  // Check if data has changed from FE (if changeCheck provided)
  if (body.changeCheck) {
    const changes = [];
    if (body.changeCheck.expectedIbadah && current.id_ibadah !== body.changeCheck.expectedIbadah) {
      changes.push('service');
    }
    if (body.changeCheck.expectedUser && current.id_users !== body.changeCheck.expectedUser) {
      changes.push('user');
    }
    if (body.changeCheck.expectedPosition && current.id_pelayanPosition !== body.changeCheck.expectedPosition) {
      changes.push('position');
    }

    if (changes.length > 0) {
      return c.json({
        success: false,
        error: `Data has changed (${changes.join(', ')}). Please refresh and try again.`,
        hasChanged: true,
        currentData: current,
        changedFields: changes,
        type: 'data_changed'
      }, 409);
    }
  }

  // Determine new values after update
  const newIbadah = validated.id_ibadah ?? current.id_ibadah;
  const newPosition = validated.id_pelayanPosition ?? current.id_pelayanPosition;
  const newUser = validated.id_users ?? current.id_users;

  // Check if user is already assigned to this ibadah (if user or ibadah is changing)
  if (validated.id_users || validated.id_ibadah) {
    const userCheck = checkUserAlreadyAssigned(newIbadah, newUser, id);
    
    if (userCheck.alreadyAssigned) {
      return c.json({
        success: false,
        error: userCheck.message,
        existingPosition: userCheck.existingPosition,
        type: 'user_already_assigned'
      }, 409);
    }
  }

  // Check for position conflict if position or ibadah is being changed
  if (validated.id_ibadah || validated.id_pelayanPosition) {
    const conflictCheck = checkPositionConflict(newIbadah, newPosition, id);
    
    if (conflictCheck.conflict) {
      return c.json({ 
        success: false, 
        error: conflictCheck.message,
        conflictWith: conflictCheck.existingUser,
        type: 'position_conflict'
      }, 409);
    }
  }

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