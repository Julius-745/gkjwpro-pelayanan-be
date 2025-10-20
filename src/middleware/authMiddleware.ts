// middleware/authMiddleware.ts
import type { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import type { AdminUser, JWTPayload } from '../types/auth';
import { AuthService } from '../services/authService';

declare module 'hono' {
  interface ContextVariableMap {
    user: AdminUser;
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;

// Authenticate JWT token
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
      return c.json(
        { success: false, message: 'Invalid or expired token' },
        403
      );
    }

    // Fetch user from DB/service
    const user = await AuthService.getUserById(decoded.userId);
    
    if (!user) {
      return c.json(
        { success: false, message: 'User not found or inactive' },
        403
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return c.json(
        { success: false, message: 'Account is disabled' },
        403
      );
    }

    // Save user to context
    c.set('user', user);
    await next();
  } catch (e) {
    console.error('Token verification error:', e);
    return c.json(
      { success: false, message: 'Invalid or expired token' },
      403
    );
  }
};

// Role-based access control
export const requireRole = (allowedRoles: Array<"super_admin" | "admin" | "user">) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        { success: false, error: "Authentication required" },
        401
      );
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        { 
          success: false, 
          error: "Insufficient permissions",
          required: allowedRoles,
          current: user.role
        },
        403
      );
    }

    await next();
  };
};

// Resource-based access control (for checking ownership)
export const requireOwnership = (getResourceUserId: (c: Context) => number | null) => {
  return async (c: Context, next: Next) => {
    const currentUser = c.get("user");

    if (!currentUser) {
      return c.json(
        { success: false, error: "Authentication required" },
        401
      );
    }

    // Super admin can access everything
    if (currentUser.role === "super_admin") {
      await next();
      return;
    }

    const resourceUserId = getResourceUserId(c);

    if (resourceUserId === null) {
      return c.json(
        { success: false, error: "Resource not found" },
        404
      );
    }

    // Check if user owns the resource
    if (currentUser.id !== resourceUserId) {
      return c.json(
        { 
          success: false, 
          error: "Access denied. You can only access your own resources" 
        },
        403
      );
    }

    await next();
  };
};

// Permission checker utility
export const hasPermission = (
  userRole: "super_admin" | "admin" | "user",
  requiredPermission: string
): boolean => {
  const permissions = {
    super_admin: [
      // Full access to everything
      "admin_users:create",
      "admin_users:read",
      "admin_users:update",
      "admin_users:delete",
      "users:create",
      "users:read",
      "users:update",
      "users:delete",
      "ibadah:create",
      "ibadah:read",
      "ibadah:update",
      "ibadah:delete",
      "assignments:create",
      "assignments:read",
      "assignments:update",
      "assignments:delete",
      "categories:create",
      "categories:read",
      "categories:update",
      "categories:delete",
      "positions:create",
      "positions:read",
      "positions:update",
      "positions:delete",
      "levels:create",
      "levels:read",
      "levels:update",
      "levels:delete",
      "krw:create",
      "krw:read",
      "krw:update",
      "krw:delete",
      "dashboard:read",
      "reports:read",
      "settings:update"
    ],
    admin: [
      // Cannot manage admin_users
      "users:create",
      "users:read",
      "users:update",
      "users:delete",
      "ibadah:create",
      "ibadah:read",
      "ibadah:update",
      "ibadah:delete",
      "assignments:create",
      "assignments:read",
      "assignments:update",
      "assignments:delete",
      "categories:create",
      "categories:read",
      "categories:update",
      "categories:delete",
      "positions:create",
      "positions:read",
      "positions:update",
      "positions:delete",
      "levels:create",
      "levels:read",
      "levels:update",
      "levels:delete",
      "krw:create",
      "krw:read",
      "krw:update",
      "krw:delete",
      "dashboard:read",
      "reports:read"
    ],
    user: [
      // Read-only access to dashboard
      "dashboard:read"
    ]
  };

  return permissions[userRole]?.includes(requiredPermission) || false;
};

// Middleware to check specific permission
export const requirePermission = (permission: string) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        { success: false, error: "Authentication required" },
        401
      );
    }

    if (!hasPermission(user.role, permission)) {
      return c.json(
        { 
          success: false, 
          error: "Insufficient permissions",
          required: permission,
          role: user.role
        },
        403
      );
    }

    await next();
  };
};

// Update last login timestamp
export const updateLastLogin = (userId: number) => {
  try {
    const stmt = db.prepare(
      "UPDATE admin_users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?"
    );
    stmt.run(userId);
  } catch (error) {
    console.error("Failed to update last login:", error);
  }
};