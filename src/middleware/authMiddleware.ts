import type { Context, Next } from 'hono';
import { AuthService } from '../services/authService';
import type { AdminUser } from '../types/auth';

declare module 'hono' {
  interface ContextVariableMap {
    user: AdminUser;
  }
}

export const authenticateToken = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return c.json({
      success: false,
      message: 'Access token is required'
    }, 401);
  }

  const decoded = AuthService.verifyToken(token);
  
  if (!decoded) {
    return c.json({
      success: false,
      message: 'Invalid or expired token'
    }, 403);
  }

  const user = AuthService.getUserById(decoded.userId);
  
  if (!user) {
    return c.json({
      success: false,
      message: 'User not found or inactive'
    }, 403);
  }

  c.set('user', user);
  await next();
};

export const requireRole = (roles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({
        success: false,
        message: 'Authentication required'
      }, 401);
    }

    if (!roles.includes(user.role)) {
      return c.json({
        success: false,
        message: 'Insufficient permissions'
      }, 403);
    }

    await next();
  };
};