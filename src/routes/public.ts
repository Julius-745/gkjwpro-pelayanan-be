import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import db from "../db";

const publicApi = new OpenAPIHono();

// Reusable Schema for Calendar Data
const CalendarEventSchema = z.object({
  id: z.string().openapi({ example: "assignment-0" }),
  start: z.string(),
  end: z.string(),
  title: z.string().openapi({ example: "Ibadah Minggu Pagi" }),
  tata_ibadah_link: z
    .string()
    .optional()
    .openapi({ example: "https://example.com/tata-ibadah" }),
  meta: z.object({
    assignments: z.array(
      z.object({
        userName: z.string().openapi({ example: "John Doe" }),
        positionName: z.string().openapi({ example: "Organis" }),
      }),
    ),
  }),
});

type CalendarEvent = z.infer<typeof CalendarEventSchema>;

const listCalendarRoute = createRoute({
  method: "get",
  path: "/calendar",
  summary: "Get public calendar events",
  description:
    "Retrieve worship service assignments formatted for calendar display",
  tags: ["Public"],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.array(CalendarEventSchema),
            expires: z.number().openapi({ example: 123456789 }),
          }),
        },
      },
      description: "Successfully retrieved calendar events",
    },
  },
});

interface CalendarCache {
  data: CalendarEvent[];
  expires: number;
}

let calendarCache: CalendarCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface IbadahAssignmentRow {
  id: number;
  service_date: string;
  tata_ibadah_link: string | null;
  start_service_time: string | null;
  end_service_time: string | null;
  userName: string | null;
  positionName: string | null;
  categoryName: string | null;
}

publicApi.openapi(listCalendarRoute, async (c) => {
  const now = Date.now();

  if (calendarCache && now < calendarCache.expires) {
    return c.json(
      {
        success: true,
        data: calendarCache.data,
        expires: calendarCache.expires,
      },
      200,
    );
  }

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
    .all() as IbadahAssignmentRow[];

  const grouped: Record<
    string,
    {
      categoryName: string;
      assignments: { userName: string; positionName: string }[];
      tata_ibadah_link?: string;
    }
  > = {};

  rows.forEach((row) => {
    const categoryName = row.categoryName ?? "Unknown";
    const startServiceTime = row.start_service_time ?? "00:00";
    const endServiceTime = row.end_service_time ?? "00:00";

    const key = `${row.service_date}T${startServiceTime} - ${endServiceTime} - ${categoryName}`;
    if (!grouped[key]) {
      grouped[key] = {
        categoryName: categoryName,
        tata_ibadah_link:
          row.tata_ibadah_link === null ? undefined : row.tata_ibadah_link,
        assignments: [],
      };
    }
    const currentGroup = grouped[key];
    if (currentGroup) {
      currentGroup.assignments.push({
        userName: row.userName ?? "Unknown",
        positionName: row.positionName ?? "Unknown",
      });
    }
  });

  // Convert grouped data into calendar events
  const events: CalendarEvent[] = Object.entries(grouped).map(
    ([key, group], idx) => {
      const [datePart, timePartRaw] = key.split("T");
      const timePart = timePartRaw ?? "00:00 - 00:00";
      const [startTimeRaw, endTimeRaw] = timePart.split(" - ");
      const startTime = startTimeRaw?.trim() || "00:00";
      const endTime = endTimeRaw?.trim().replace(/ - .*/, "") || "00:00";

      return {
        id: `assignment-${idx}`,
        start: `${datePart}T${startTime}`,
        end: `${datePart}T${endTime}`,
        title: group.categoryName,
        tata_ibadah_link: group.tata_ibadah_link,
        meta: {
          assignments: group.assignments,
        },
      };
    },
  );

  calendarCache = { data: events, expires: now + CACHE_DURATION };

  return c.json(
    {
      success: true,
      data: events,
      expires: calendarCache.expires,
    },
    200,
  );
});

export default publicApi;
