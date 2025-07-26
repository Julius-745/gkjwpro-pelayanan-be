import type { Context, Next } from "hono";
import { logger } from "../utils/logger";

export const requestLogger = async (c: Context, next: Next) => {
  const start = Date.now();
  
  await next();
  
  const ms = Date.now() - start;
  const { method, url } = c.req;
  const status = c.res.status;
  
  logger.info(`${method} ${url} - ${status} - ${ms}ms`);
};