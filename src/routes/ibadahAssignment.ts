import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";
import type { AppEnv } from "../types/hono";
import * as XLSX from "xlsx";

const assignments = new OpenAPIHono<AppEnv>();

// Interfaces for DB results
interface ConflictRow {
  id: number;
  service_date: string;
  start_service_time: string | null;
  end_service_time: string | null;
  categoryName: string;
  positionName: string;
  new_service_date: string;
}

interface PositionConflictRow {
  id: number;
  userName: string;
  positionName: string;
}

interface UserAlreadyAssignedRow {
  id: number;
  positionName: string;
}

interface AssignmentDataRow {
  id: number;
  id_ibadah: number;
  id_users: number;
  id_pelayanPosition: number;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  positionName?: string;
  tata_ibadah_link?: string;
  service_date?: string;
  start_service_time?: string;
  end_service_time?: string;
  categoryName?: string;
}

interface CalendarRow {
  id: number;
  service_date: string;
  tata_ibadah_link: string | null;
  start_service_time: string | null;
  end_service_time: string | null;
  userName: string;
  positionName: string;
  categoryName: string;
}

interface ExcelDataRow {
  service_date: string;
  start_service_time: string | null;
  categoryName: string;
  stola: string | null;
  dress_code: string | null;
  positionName: string;
  userName: string;
  position_id: number;
  category_id: number;
}

// Schemas
const AssignmentSchema = z.object({
  id: z.number(),
  id_ibadah: z.number(),
  id_users: z.number(),
  id_pelayanPosition: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  userName: z.string().optional(),
  positionName: z.string().optional(),
  tata_ibadah_link: z.string().optional(),
  service_date: z.string().optional(),
  start_service_time: z.string().optional(),
  end_service_time: z.string().optional(),
  categoryName: z.string().optional(),
});

const CreateAssignmentDTO = z.object({
  id_ibadah: z.number().int().positive(),
  id_users: z.number().int().positive(),
  id_pelayanPosition: z.number().int().positive(),
  id_ibadahCategory: z.number().int().positive().optional(),
  changeCheck: z
    .object({
      expectedUser: z.number().optional(),
    })
    .optional(),
});

const UpdateAssignmentDTO = z.object({
  id_ibadah: z.number().int().positive().optional(),
  id_users: z.number().int().positive().optional(),
  id_pelayanPosition: z.number().int().positive().optional(),
  changeCheck: z
    .object({
      expectedIbadah: z.number().optional(),
      expectedUser: z.number().optional(),
      expectedPosition: z.number().optional(),
    })
    .optional(),
});

// Helper functions (implicitly typed)
function checkUserDateConflict(
  id_ibadah: number,
  id_users: number,
  excludeAssignmentId?: number,
) {
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
      ${excludeAssignmentId ? "AND ia.id != ?" : ""}
  `;
  const params = excludeAssignmentId
    ? [id_ibadah, id_users, id_ibadah, excludeAssignmentId]
    : [id_ibadah, id_users, id_ibadah];
  const existing = db.prepare(query).get(...params) as ConflictRow | undefined;
  if (existing) {
    return {
      hasConflict: true,
      message: `This user is already assigned to "${existing.categoryName}" (${existing.start_service_time} - ${existing.end_service_time}) as "${existing.positionName}" on ${existing.service_date}`,
      conflictingIbadah: existing,
    };
  }
  return { hasConflict: false };
}

function checkPositionConflict(
  id_ibadah: number,
  id_pelayanPosition: number,
  excludeAssignmentId?: number,
) {
  const query = `
    SELECT ia.id, u.name as userName, pp.positionName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    WHERE ia.id_ibadah = ? AND ia.id_pelayanPosition = ?
    ${excludeAssignmentId ? "AND ia.id != ?" : ""}
  `;
  const params = excludeAssignmentId
    ? [id_ibadah, id_pelayanPosition, excludeAssignmentId]
    : [id_ibadah, id_pelayanPosition];
  const existing = db.prepare(query).get(...params) as
    | PositionConflictRow
    | undefined;
  if (existing) {
    return {
      conflict: true,
      message: `Position "${existing.positionName}" is already assigned to ${existing.userName} for this service`,
      existingUser: existing.userName,
    };
  }
  return { conflict: false };
}

function checkUserAlreadyAssigned(
  id_ibadah: number,
  id_users: number,
  id_ibadahCategory?: number,
  excludeAssignmentId?: number,
) {
  if (!id_ibadahCategory) {
    const query = `
      SELECT ia.id, pp.positionName
      FROM ibadah_assignments ia
      LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
      WHERE ia.id_ibadah = ? AND ia.id_users = ?
      ${excludeAssignmentId ? "AND ia.id != ?" : ""}
    `;
    const params = excludeAssignmentId
      ? [id_ibadah, id_users, excludeAssignmentId]
      : [id_ibadah, id_users];
    const existing = db.prepare(query).get(...params) as
      | UserAlreadyAssignedRow
      | undefined;
    if (existing) {
      return {
        alreadyAssigned: true,
        message: `This user is already assigned as "${existing.positionName}" for this service`,
        existingPosition: existing.positionName,
      };
    }
    return { alreadyAssigned: false };
  }

  const query = `
    SELECT ia.id, pp.positionName, i.id_ibadahCategory
    FROM ibadah_assignments ia
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    WHERE ia.id_ibadah = ? AND ia.id_users = ? AND i.id_ibadahCategory = ?
    ${excludeAssignmentId ? "AND ia.id != ?" : ""}
  `;
  const params = excludeAssignmentId
    ? [id_ibadah, id_users, id_ibadahCategory, excludeAssignmentId]
    : [id_ibadah, id_users, id_ibadahCategory];
  const existing = db.prepare(query).get(...params) as
    | UserAlreadyAssignedRow
    | undefined;
  if (existing) {
    return {
      alreadyAssigned: true,
      message: `This user is already assigned as "${existing.positionName}" for this service and category`,
      existingPosition: existing.positionName,
    };
  }
  return { alreadyAssigned: false };
}

// Route Definitions
const listAssignmentsRoute = createRoute({
  method: "get",
  path: "/",
  summary: "Get all assignments",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      id_ibadah: z.coerce.number().optional(),
      id_pelayanPosition: z.coerce.number().optional(),
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
            data: z.array(AssignmentSchema),
            total: z.number(),
            skip: z.number(),
            take: z.number(),
          }),
        },
      },
      description: "Successfully retrieved assignments",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const getCalendarRoute = createRoute({
  method: "get",
  path: "/calendar",
  summary: "Get assignments for calendar",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(
              z.object({
                id: z.string(),
                start: z.string(),
                end: z.string(),
                title: z.string(),
                tata_ibadah_link: z.string().optional(),
                meta: z.object({
                  assignments: z.array(
                    z.object({
                      userName: z.string(),
                      positionName: z.string(),
                    }),
                  ),
                }),
              }),
            ),
          }),
        },
      },
      description: "Successfully retrieved calendar events",
    },
  },
});

const getExcelRoute = createRoute({
  method: "get",
  path: "/export/excel",
  summary: "Export assignments to Excel",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: { description: "Excel file exported successfully" },
    500: { description: "Export failed" },
    403: { description: "Forbidden" },
  },
});

const getAssignmentRoute = createRoute({
  method: "get",
  path: "/{id}",
  summary: "Get assignment by ID",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AssignmentSchema }),
        },
      },
      description: "Assignment found",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Assignment not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

const createAssignmentRoute = createRoute({
  method: "post",
  path: "/",
  summary: "Create a new assignment",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: CreateAssignmentDTO } } },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AssignmentSchema }),
        },
      },
      description: "Assignment created",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Conflict or invalid input",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
    409: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            conflictingIbadah: z.unknown().optional(),
            existingPosition: z.string().optional(),
            conflictWith: z.string().optional(),
            hasChanged: z.boolean().optional(),
            type: z.string(),
          }),
        },
      },
      description: "Conflict",
    },
  },
});

const updateAssignmentRoute = createRoute({
  method: "patch",
  path: "/{id}",
  summary: "Update an assignment",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({ id: z.coerce.number() }),
    body: { content: { "application/json": { schema: UpdateAssignmentDTO } } },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), data: AssignmentSchema }),
        },
      },
      description: "Assignment updated",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Assignment not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
    400: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Invalid input",
    },
    409: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            hasChanged: z.boolean().optional(),
            type: z.string(),
          }),
        },
      },
      description: "Conflict",
    },
  },
});

const deleteAssignmentRoute = createRoute({
  method: "delete",
  path: "/{id}",
  summary: "Delete an assignment",
  tags: ["Assignments"],
  security: [{ bearerAuth: [] }],
  request: { params: z.object({ id: z.coerce.number() }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
      description: "Assignment deleted",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), error: z.string() }),
        },
      },
      description: "Assignment not found",
    },
    403: { description: "Forbidden" },
    401: { description: "Unauthorized" },
  },
});

// Implementation
assignments.openapi(listAssignmentsRoute, (c) => {
  const user = c.get("user");
  if (!user || user.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  const { search, id_ibadah, id_pelayanPosition, skip, take } =
    c.req.valid("query");

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
  const values: (string | number)[] = [];

  if (search) {
    conditions.push(
      "(u.name LIKE ? OR pp.positionName LIKE ? OR ic.categoryName LIKE ?)",
    );
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
  const data = db
    .prepare(query)
    .all(...values, take, skip) as AssignmentDataRow[];

  let countQuery = `SELECT COUNT(*) as total FROM ibadah_assignments ia LEFT JOIN users u ON ia.id_users = u.id LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id LEFT JOIN ibadah i ON ia.id_ibadah = i.id LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id`;
  if (conditions.length > 0) countQuery += " WHERE " + conditions.join(" AND ");
  const countResult = db.prepare(countQuery).get(...values) as {
    total: number;
  };
  const total = countResult?.total ?? 0;

  return c.json(
    { success: true, data: data as AssignmentDataRow[], total, skip, take },
    200,
  );
});

assignments.openapi(getCalendarRoute, (c) => {
  const rows = db
    .prepare(
      `
    SELECT ia.id, i.service_date, i.tata_ibadah_link, i.start_service_time, i.end_service_time, 
           u.name as userName, pp.positionName, ic.categoryName
    FROM ibadah_assignments ia
    LEFT JOIN users u ON ia.id_users = u.id
    LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
    LEFT JOIN ibadah i ON ia.id_ibadah = i.id
    LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  `,
    )
    .all() as CalendarRow[];

  const grouped: Record<
    string,
    {
      categoryName: string;
      assignments: { userName: string; positionName: string }[];
      tata_ibadah_link?: string;
    }
  > = {};

  rows.forEach((row) => {
    const key = `${row.service_date}T${row.start_service_time ?? "00:00"} - ${row.end_service_time ?? "00:00"} - ${row.categoryName}`;
    if (!grouped[key]) {
      grouped[key] = {
        categoryName: row.categoryName,
        tata_ibadah_link: row.tata_ibadah_link ?? undefined,
        assignments: [],
      };
    }
    grouped[key].assignments.push({
      userName: row.userName,
      positionName: row.positionName,
    });
  });

  const events = Object.entries(grouped).map(([key, group], idx) => {
    const [datePart, timePartRaw] = key.split("T");
    const [startTimeRaw, endTimeRaw] = (timePartRaw ?? "00:00 - 00:00").split(
      " - ",
    );
    const startTime = startTimeRaw?.trim() || "00:00";
    const endTime = endTimeRaw?.trim().replace(/ - .*/, "") || "00:00";

    return {
      id: `assignment-${idx}`,
      start: `${datePart}T${startTime}`,
      end: `${datePart}T${endTime}`,
      title: group.categoryName,
      tata_ibadah_link: group.tata_ibadah_link,
      meta: { assignments: group.assignments },
    };
  });

  return c.json({ success: true, data: events }, 200);
});

assignments.openapi(getExcelRoute, (c) => {
  const currentUser = c.get("user");
  if (!currentUser || currentUser.role === "user") {
    return c.json({ success: false, error: "Forbidden" }, 403);
  }

  try {
    const rawData = db
      .prepare(
        `
      SELECT i.service_date, i.start_service_time, ic.categoryName, i.stola, i.dress_code, pp.positionName, u.name as userName, pp.id as position_id, ic.id as category_id
      FROM ibadah_assignments ia
      INNER JOIN users u ON ia.id_users = u.id
      INNER JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
      INNER JOIN ibadah i ON ia.id_ibadah = i.id
      INNER JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
      ORDER BY i.service_date ASC, i.start_service_time ASC, pp.positionName ASC
    `,
      )
      .all() as ExcelDataRow[];

    const positionSet = new Set<string>();
    const dataMatrix = new Map<string, Map<string, string>>();

    rawData.forEach((row) => {
      const columnKey = `${row.service_date}|${row.start_service_time || "00:00"}-${row.categoryName}`;
      positionSet.add(row.positionName);
      if (!dataMatrix.has(row.positionName))
        dataMatrix.set(row.positionName, new Map());
      dataMatrix.get(row.positionName)!.set(columnKey, row.userName);
    });

    const uniqueDateTimes = [
      ...new Set(
        rawData.map(
          (row) =>
            `${row.service_date}|${row.start_service_time || "00:00"}-${row.categoryName}`,
        ),
      ),
    ].sort();
    const sortedPositions = Array.from(positionSet).sort();

    const headers = [
      "Pelayan/Position",
      ...uniqueDateTimes.map((dt) => dt.split("|")[0] || ""),
    ];
    const timeHeaders = [
      "Waktu",
      ...uniqueDateTimes.map((dt) => {
        const parts = dt.split("|");
        const timeAndCat = parts[1] || "";
        return timeAndCat.split("-")[1] || "";
      }),
    ];

    const excelData = [headers, timeHeaders];
    sortedPositions.forEach((position) => {
      const rowArr = [position];
      uniqueDateTimes.forEach((dateTime) =>
        rowArr.push(dataMatrix.get(position)?.get(dateTime) || ""),
      );
      excelData.push(rowArr);
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 25 },
      ...Array(uniqueDateTimes.length).fill({ wch: 15 }),
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Pelayanan");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;
    const filename = `Jadwal_Pelayanan_${new Date().toISOString().split("T")[0]}.xlsx`;

    c.header(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    c.header("Content-Disposition", `attachment; filename="${filename}"`);
    return c.body(buffer as any);
  } catch (error) {
    console.error("Export error:", error);
    return c.json({ success: false, error: "Export failed" }, 500);
  }
});

assignments.openapi(getAssignmentRoute, (c) => {
  const { id } = c.req.valid("param");
  const data = db
    .prepare(
      `SELECT ia.*, u.name as userName, pp.positionName FROM ibadah_assignments ia LEFT JOIN users u ON ia.id_users = u.id LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id WHERE ia.id = ?`,
    )
    .get(id) as AssignmentDataRow | undefined;
  if (!data) {
    return c.json({ success: false, error: "Not found" }, 404);
  }
  return c.json({ success: true, data: data as AssignmentDataRow }, 200);
});

assignments.openapi(createAssignmentRoute, async (c) => {
  const validated = c.req.valid("json");
  const ibadah = db
    .prepare("SELECT id, id_ibadahCategory FROM ibadah WHERE id = ?")
    .get(validated.id_ibadah) as
    | { id: number; id_ibadahCategory: number }
    | undefined;
  if (!ibadah) {
    return c.json({ success: false, error: "Ibadah not found" }, 400);
  }
  if (
    !db.prepare("SELECT id FROM users WHERE id = ?").get(validated.id_users)
  ) {
    return c.json({ success: false, error: "User not found" }, 400);
  }
  if (
    !db
      .prepare("SELECT id FROM pelayanPosition WHERE id = ?")
      .get(validated.id_pelayanPosition)
  ) {
    return c.json({ success: false, error: "Position not found" }, 400);
  }

  const categoryId = ibadah.id_ibadahCategory;
  const dateConflict = checkUserDateConflict(
    validated.id_ibadah,
    validated.id_users,
  );
  if (dateConflict.hasConflict) {
    return c.json(
      {
        success: false,
        error: dateConflict.message,
        conflictingIbadah: dateConflict.conflictingIbadah,
        type: "date_conflict",
      },
      409,
    );
  }

  const userCheck = checkUserAlreadyAssigned(
    validated.id_ibadah,
    validated.id_users,
    categoryId,
  );
  if (userCheck.alreadyAssigned) {
    return c.json(
      {
        success: false,
        error: userCheck.message,
        existingPosition: userCheck.existingPosition,
        type: "user_already_assigned",
      },
      409,
    );
  }

  const posConflict = checkPositionConflict(
    validated.id_ibadah,
    validated.id_pelayanPosition,
  );
  if (posConflict.conflict) {
    return c.json(
      {
        success: false,
        error: posConflict.message,
        conflictWith: posConflict.existingUser,
        type: "position_conflict",
      },
      409,
    );
  }

  if (validated.changeCheck) {
    const existing = db
      .prepare(
        `SELECT ia.* FROM ibadah_assignments ia WHERE ia.id_ibadah = ? AND ia.id_pelayanPosition = ?`,
      )
      .get(validated.id_ibadah, validated.id_pelayanPosition) as
      | AssignmentDataRow
      | undefined;
    if (
      existing &&
      validated.changeCheck.expectedUser &&
      existing.id_users !== validated.changeCheck.expectedUser
    ) {
      return c.json(
        {
          success: false,
          error: "Data has changed. Please refresh and try again.",
          hasChanged: true,
          type: "data_changed",
        },
        409,
      );
    }
  }

  const info = db
    .prepare(
      `INSERT INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition) VALUES (?, ?, ?)`,
    )
    .run(validated.id_ibadah, validated.id_users, validated.id_pelayanPosition);
  const row = db
    .prepare(
      `
      SELECT ia.*, u.name as userName, pp.positionName 
      FROM ibadah_assignments ia 
      LEFT JOIN users u ON ia.id_users = u.id 
      LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id 
      WHERE ia.id = ?
    `,
    )
    .get(info.lastInsertRowid) as AssignmentDataRow;
  return c.json({ success: true, data: row as AssignmentDataRow }, 201);
});

assignments.openapi(updateAssignmentRoute, async (c) => {
  const { id } = c.req.valid("param");
  const validated = c.req.valid("json");
  const current = db
    .prepare(`SELECT ia.* FROM ibadah_assignments ia WHERE ia.id = ?`)
    .get(id) as AssignmentDataRow | undefined;
  if (!current) {
    return c.json({ success: false, error: "Assignment not found" }, 404);
  }

  if (validated.changeCheck) {
    const changes = [];
    if (
      validated.changeCheck.expectedIbadah &&
      current.id_ibadah !== validated.changeCheck.expectedIbadah
    )
      changes.push("service");
    if (
      validated.changeCheck.expectedUser &&
      current.id_users !== validated.changeCheck.expectedUser
    )
      changes.push("user");
    if (
      validated.changeCheck.expectedPosition &&
      current.id_pelayanPosition !== validated.changeCheck.expectedPosition
    )
      changes.push("position");
    if (changes.length > 0) {
      return c.json(
        {
          success: false,
          error: `Data has changed.`,
          hasChanged: true,
          type: "data_changed",
        },
        409,
      );
    }
  }

  const sets: string[] = [];
  const values: (string | number)[] = [];

  if (validated.id_ibadah !== undefined) {
    sets.push("id_ibadah = ?");
    values.push(validated.id_ibadah);
  }
  if (validated.id_users !== undefined) {
    sets.push("id_users = ?");
    values.push(validated.id_users);
  }
  if (validated.id_pelayanPosition !== undefined) {
    sets.push("id_pelayanPosition = ?");
    values.push(validated.id_pelayanPosition);
  }

  if (sets.length === 0) {
    const data = db
      .prepare(
        `SELECT ia.*, u.name as userName, pp.positionName FROM ibadah_assignments ia LEFT JOIN users u ON ia.id_users = u.id LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id WHERE ia.id = ?`,
      )
      .get(id) as AssignmentDataRow;
    return c.json({ success: true, data: data as AssignmentDataRow }, 200);
  }

  db.prepare(
    `UPDATE ibadah_assignments SET ${sets.join(", ")} WHERE id = ?`,
  ).run(...values, id);

  const updated = db
    .prepare(
      `
      SELECT ia.*, u.name as userName, pp.positionName 
      FROM ibadah_assignments ia 
      LEFT JOIN users u ON ia.id_users = u.id 
      LEFT JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id 
      WHERE ia.id = ?
    `,
    )
    .get(id) as AssignmentDataRow;

  return c.json({ success: true, data: updated as AssignmentDataRow }, 200);
});

assignments.openapi(deleteAssignmentRoute, (c) => {
  const { id } = c.req.valid("param");
  const info = db
    .prepare("DELETE FROM ibadah_assignments WHERE id = ?")
    .run(id);

  if (info.changes === 0) {
    return c.json({ success: false, error: "Assignment not found" }, 404);
  }

  return c.json(
    { success: true, message: "Assignment deleted successfully" },
    200,
  );
});

export default assignments;
