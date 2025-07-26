import type { Context, Next } from "hono";

const requests = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 100; // requests per window

export const rateLimiter = async (c: Context, next: Next) => {
  const ip = c.req.header("x-forwarded-for") || "unknown";
  const now = Date.now();
  
  const clientData = requests.get(ip);
  
  if (!clientData || now > clientData.resetTime) {
    requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }
  
  if (clientData.count >= MAX_REQUESTS) {
    return c.json(
      { success: false, error: "Too many requests" },
      429
    );
  }
  
  clientData.count++;
  return next();
};