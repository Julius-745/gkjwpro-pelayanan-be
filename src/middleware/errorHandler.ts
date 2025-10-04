import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { logger } from "../utils/logger";

export const errorHandler = (err: Error, c: Context) => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
      ...(e.received !== undefined && { received: e.received })
    }));

    // Pretty console logging
    logger.error('\n🔴 Validation Error:');
    formattedErrors.forEach(e => {
      logger.error(`  • Field: ${e.field}`);
      logger.error(`    Message: ${e.message}`);
      if (e.received) logger.error(`    Received: ${JSON.stringify(e.received)}`);
    });

    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: formattedErrors
      },
      400
    );
  }

  // Log other errors
  logger.error("Application error:", err);

  // Handle HTTP exceptions
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