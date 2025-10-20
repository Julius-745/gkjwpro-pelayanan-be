import {sign, verify} from 'hono/jwt'
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { jwtConfig } from '../config/auth';
import db from '../db';
import type { AdminUser, LoginRequest, RegisterRequest, JWTPayload, AuthResponse } from '../types/auth';

const loginSchema = z.object({
  email: z.string().email('Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  role: z.string().min(3, 'Role must be at least 4 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export class AuthService {
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const validatedData = registerSchema.parse(userData);
      const { username, email, password, role } = validatedData;

      const existingUser = db.prepare('SELECT id FROM admin_users WHERE username = ? OR email = ?').get(username, email);
      
      if (existingUser) {
        return { success: false, message: 'User with this username or email already exists' };
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertStmt = db.prepare(`
        INSERT INTO admin_users (username, email, password, role)
        VALUES (?, ?, ?, ?)
      `);
      
      const result = insertStmt.run(username, email, hashedPassword, role);
      const newUser = db.prepare('SELECT id, username, role, email, role, isActive FROM admin_users WHERE id = ?').get(result.lastInsertRowid);

      return {
        success: true,
        message: 'User registered successfully',
        user: newUser
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, message: error.errors[0].message };
      }
      console.error('Registration error:', error);
      return { success: false, message: 'Registration failed' };
    }
  }

  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const validatedData = loginSchema.parse(loginData);
      const { email, password } = validatedData;

      const user = db.prepare('SELECT * FROM admin_users WHERE email = ? AND isActive = 1').get(email) as any;

      if (!user) {
        return { success: false, message: 'Invalid credentials' };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password); 

      if (!isPasswordValid) {
        return { success: false, message: 'Invalid credentials' };
      }

      db.prepare('UPDATE admin_users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

      const payload: JWTPayload = {
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + (60 * 60)
      };

      const token = await sign(payload, jwtConfig.secret);

      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        message: 'Login successful',
        token: token,
        user: userWithoutPassword
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, message: error.errors[0].message };
      }
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = await verify(token, jwtConfig.secret);

    if (typeof decoded === "string") {
      console.error("Unexpected string payload in token:", decoded);
      return null;
    }

    return decoded as JWTPayload;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      console.error("Token expired");
    } else if (error.name === "JsonWebTokenError") {
      console.error("Invalid token:", error.message);
    } else {
      console.error("Token verification error:", error);
    }
    return null;
  }
}


  static getUserById(userId: number): AdminUser | null {
    try {
      const user = db.prepare('SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users WHERE id = ? AND isActive = 1   ').get(userId) as AdminUser;
      return user || null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  static async createDefaultAdmin(): Promise<void> {
    try {
      const existingAdmin = db.prepare('SELECT id FROM admin_users LIMIT 1').get();
      
      if (!existingAdmin) {
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
        const defaultEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
        const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456';

        await this.register({
          username: defaultUsername,
          email: defaultEmail,
          password: defaultPassword,
          confirmPassword: defaultPassword,
          role: 'super_admin',
        });

        console.log(`✅ Default admin created: ${defaultUsername}`);
      }
    } catch (error) {
      console.error('Error creating default admin:', error);
    }
  }
}