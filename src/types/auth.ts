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