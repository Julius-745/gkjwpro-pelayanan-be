// types/auth.ts

export type UserRole = 'super_admin' | 'admin' | 'user';

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  role: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
  [key: string]: any
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: Partial<AdminUser>;
  token?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// Permission constants
export const PERMISSIONS = {
  super_admin: [
    // Admin users management
    'admin_users:create',
    'admin_users:read',
    'admin_users:update',
    'admin_users:delete',
    
    // Regular users
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    
    // Ibadah services
    'ibadah:create',
    'ibadah:read',
    'ibadah:update',
    'ibadah:delete',
    
    // Assignments
    'assignments:create',
    'assignments:read',
    'assignments:update',
    'assignments:delete',
    
    // Master data
    'categories:create',
    'categories:read',
    'categories:update',
    'categories:delete',
    'positions:create',
    'positions:read',
    'positions:update',
    'positions:delete',
    'levels:create',
    'levels:read',
    'levels:update',
    'levels:delete',
    'krw:create',
    'krw:read',
    'krw:update',
    'krw:delete',
    
    // Dashboard & Reports
    'dashboard:read',
    'reports:read',
    'reports:export',
    
    // Settings
    'settings:update',
  ],
  admin: [
    // Regular users (no admin_users)
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    
    // Ibadah services
    'ibadah:create',
    'ibadah:read',
    'ibadah:update',
    'ibadah:delete',
    
    // Assignments
    'assignments:create',
    'assignments:read',
    'assignments:update',
    'assignments:delete',
    
    // Master data
    'categories:create',
    'categories:read',
    'categories:update',
    'categories:delete',
    'positions:create',
    'positions:read',
    'positions:update',
    'positions:delete',
    'levels:create',
    'levels:read',
    'levels:update',
    'levels:delete',
    'krw:create',
    'krw:read',
    'krw:update',
    'krw:delete',
    
    // Dashboard & Reports
    'dashboard:read',
    'reports:read',
    'reports:export',
  ],
  user: [
    // Read-only dashboard
    'dashboard:read',
  ],
} as const;

// Helper type to get all permissions
export type Permission = typeof PERMISSIONS[UserRole][number];

// Route protection configuration
export interface RouteProtection {
  roles?: UserRole[];
  permissions?: string[];
  requireAll?: boolean; // true = must have all permissions, false = must have at least one
}