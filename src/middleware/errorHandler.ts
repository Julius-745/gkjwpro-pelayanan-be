import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError, type ZodIssue } from "zod";
import { logger } from "../utils/logger";

// Type guard to check if a ZodIssue has a 'received' property
function hasReceivedProperty(
  issue: ZodIssue,
): issue is ZodIssue & { received: unknown } {
  return "received" in issue;
}

export const errorHandler = (err: Error, c: Context) => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => {
      const errorObj: {
        field: string;
        message: string;
        code: string;
        received?: unknown;
      } = {
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      };

      // Use type guard to safely access 'received' property
      if (hasReceivedProperty(issue)) {
        errorObj.received = issue.received;
      }

      return errorObj;
    });

    // Pretty console logging
    logger.error("\n🔴 Validation Error:");
    formattedErrors.forEach((e) => {
      logger.error(`  • Field: ${e.field}`);
      logger.error(`    Message: ${e.message}`);
      if (e.received !== undefined)
        logger.error(`    Received: ${JSON.stringify(e.received)}`);
    });

    return c.json(
      {
        success: false,
        error: "Validation failed",
        details: formattedErrors,
      },
      400,
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
        status: err.status,
      },
      err.status,
    );
  }

  // Database constraint errors
  if (err.message.includes("SQLITE_CONSTRAINT")) {
    if (err.message.includes("UNIQUE")) {
      return c.json({ success: false, error: "Duplicate entry found" }, 400);
    }
    if (err.message.includes("FOREIGN KEY")) {
      return c.json(
        { success: false, error: "Referenced record not found" },
        400,
      );
    }
  }

  // Generic server error
  return c.json(
    {
      success: false,
      error: "Internal server error",
      ...(process.env.NODE_ENV === "development" && { details: err.message }),
    },
    500,
  );
};
