import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import type { AdminUser, JWTPayload } from '../types/auth';
import { AuthService } from '../services/authService';

declare module 'hono' {
  interface ContextVariableMap {
    user: AdminUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET!; // put your secret here

export const authenticateToken = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json(
      { success: false, message: 'Authorization header with Bearer token is required' },
      401
    );
  }

  const token = authHeader.substring(7);

  try {
    // Verify with secret
    const decoded = await verify(token, JWT_SECRET) as JWTPayload & { userId: string };

    if (!decoded?.userId) {
      return c.json({ success: false, message: 'Invalid or expired token' }, 403);
    }

    // Fetch user from DB/service
    const user = await AuthService.getUserById(decoded.userId);
    if (!user) {
      return c.json({ success: false, message: 'User not found or inactive' }, 403);
    }

    // Save user to context
    c.set('user', user);
    await next();
  } catch (e) {
    console.error('Token verification error:', e);
    return c.json({ success: false, message: 'Invalid token' }, 403);
  }
};

export const requireRole = (roles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, message: 'Authentication required' }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({ success: false, message: 'Insufficient permissions' }, 403);
    }

    await next();
  };
};
