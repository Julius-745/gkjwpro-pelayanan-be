// In your auth config file
import { z } from "zod";
import jwt from "jsonwebtoken";
import "dotenv/config";

const jwtConfigSchema = z.object({
  secret: z
    .string()
    .min(64, "JWT_SECRET must be at least 64 characters long for security")
    .refine((val) => {
      // Check for sufficient entropy - should not be simple repeated characters
      const uniqueChars = new Set(val.split("")).size;
      return uniqueChars >= 16; // At least 16 different characters
    }, "JWT_SECRET must have sufficient entropy (variety of characters)")
    .refine((val) => {
      // Check it's not a common weak pattern
      const weakPatterns = [
        /^(.)\1+$/, // All same character
        /^(01)+$/, // Repetitive binary
        /^(abc)+$/i, // Repetitive alphabet
        /^(123)+$/, // Repetitive numbers
      ];
      return !weakPatterns.some((pattern) => pattern.test(val));
    }, "JWT_SECRET contains weak patterns - use a cryptographically secure random string"),
  expiresIn: z.string().default("24h"),
  algorithm: z.literal("HS256").default("HS256"),
});

if (!process.env.JWT_SECRET) {
  console.error("❌ CRITICAL: JWT_SECRET environment variable is required!");
  console.error("💡 Generate a secure secret using:");
  console.error(
    "   node -e \"console.log(require('crypto').randomBytes(64).toString('base64'))\"",
  );
  console.error("   OR");
  console.error("   openssl rand -base64 64");
  throw new Error("JWT_SECRET environment variable is required");
}

const env = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  algorithm: "HS256" as jwt.Algorithm,
};

export const jwtConfig = jwtConfigSchema.parse(env);
