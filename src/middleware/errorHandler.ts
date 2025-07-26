import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "../utils/logger";

export const errorHandler = (err: Error, c: Context) => {
  logger.error("Application error:", err);

  if (err instanceof HTTPException) {
    return c.json(
      { 
        success: false, 
        error: err.message,
        status: err.status 
      },
      err.status
    );
  }

  // Database constraint errors
  if (err.message.includes("SQLITE_CONSTRAINT")) {
    if (err.message.includes("UNIQUE")) {
      return c.json(
        { success: false, error: "Duplicate entry found" },
        400
      );
    }
    if (err.message.includes("FOREIGN KEY")) {
      return c.json(
        { success: false, error: "Referenced record not found" },
        400
      );
    }
  }

  // Generic server error
  return c.json(
    { 
      success: false, 
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message })
    },
    500
  );
};