// In your auth config file
import { z } from 'zod';
import jwt from 'jsonwebtoken'
import 'dotenv/config';

const jwtConfigSchema = z.object({
  secret: z.string().min(32, 'JWT_SECRET must be at least 32 characters long'),
  expiresIn: z.string().default('24h'),
  algorithm: z.literal('HS256').default('HS256'),
});

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const env = {
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  algorithm: 'HS256' as jwt.Algorithm,
};

export const jwtConfig = jwtConfigSchema.parse(env);