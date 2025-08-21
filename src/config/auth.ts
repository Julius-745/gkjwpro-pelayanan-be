import { z } from 'zod';

// Load environment variables first
import 'dotenv/config';

const jwtConfigSchema = z.object({
  secret: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  expiresIn: z.string().default('24h'),
  algorithm: z.literal('HS256').default('HS256'),
});

// Manual check first (optional - Zod will also catch this)
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const env = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256' as const,
};

export const jwtConfig = jwtConfigSchema.parse(env);