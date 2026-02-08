import { sign, verify } from "hono/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { jwtConfig } from "../config/auth";
import db from "../db";
import type {
  AdminUser,
  LoginRequest,
  RegisterRequest,
  JWTPayload,
  AuthResponse,
} from "../types/auth";

const loginSchema = z.object({
  username: z.string().min(1, "Email/Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    role: z.enum(["super_admin", "admin", "user"]).default("user"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export class AuthService {
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const validatedData = registerSchema.parse(userData);
      const { username, email, password, role } = validatedData;

      const existingUser = db
        .prepare("SELECT id FROM admin_users WHERE username = ? OR email = ?")
        .get(username, email);

      if (existingUser) {
        return {
          success: false,
          message: "User with this username or email already exists",
        };
      }

      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const insertStmt = db.prepare(`
        INSERT INTO admin_users (username, email, password, role)
        VALUES (?, ?, ?, ?)
      `);

      const result = insertStmt.run(username, email, hashedPassword, role);
      const newUser = db
        .prepare(
          "SELECT id, username, email, role, isActive FROM admin_users WHERE id = ?",
        )
        .get(result.lastInsertRowid) as AdminUser | undefined;

      return {
        success: true,
        message: "User registered successfully",
        user: newUser,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: error.issues[0]?.message || "Validation failed", // FIXED: errors -> issues
        };
      }
      console.error("Registration error:", error);
      return { success: false, message: "Registration failed" };
    }
  }

  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    try {
      const validatedData = loginSchema.parse(loginData);
      const { username: identifier, password } = validatedData;

      const user = db
        .prepare(
          "SELECT * FROM admin_users WHERE (email = ? OR username = ?) AND isActive = 1",
        )
        .get(identifier, identifier) as
        | (AdminUser & { password?: string })
        | undefined;

      if (!user || !user.password) {
        return { success: false, message: "Invalid credentials" };
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return { success: false, message: "Invalid credentials" };
      }

      db.prepare(
        "UPDATE admin_users SET lastLogin = CURRENT_TIMESTAMP WHERE id = ?",
      ).run(user.id);

      const payload: JWTPayload = {
        userId: user.id.toString(),
        username: user.username,
        email: user.email,
        role: user.role as "super_admin" | "admin" | "user",
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      };

      const token = await sign(payload, jwtConfig.secret, "HS256"); // FIXED: Added algorithm

      const userWithoutPassword = { ...user };
      delete userWithoutPassword.password;

      return {
        success: true,
        message: "Login successful",
        token: token,
        user: userWithoutPassword,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          message: error.issues[0]?.message || "Validation failed", // FIXED: errors -> issues
        };
      }
      console.error("Login error:", error);
      return { success: false, message: "Login failed" };
    }
  }

  static async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = await verify(token, jwtConfig.secret, "HS256"); // FIXED: Added algorithm

      if (typeof decoded === "string") {
        console.error("Unexpected string payload in token:", decoded);
        return null;
      }

      return decoded as unknown as JWTPayload;
    } catch (error: unknown) {
      const err = error as Error & { name?: string };
      if (err.name === "TokenExpiredError") {
        console.error("Token expired");
      } else if (err.name === "JsonWebTokenError") {
        console.error("Invalid token:", err.message);
      } else {
        console.error("Token verification error:", error);
      }
      return null;
    }
  }

  static async getUserById(userId: string | number): Promise<AdminUser | null> {
    try {
      const user = db
        .prepare(
          "SELECT id, username, email, role, isActive, lastLogin, createdAt, updatedAt FROM admin_users WHERE id = ? AND isActive = 1",
        )
        .get(userId) as AdminUser | undefined;

      if (!user) return null;

      return {
        ...user,
        isActive: Boolean(user.isActive),
      };
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
  }

  static async createDefaultAdmin(): Promise<void> {
    try {
      const existingAdmin = db
        .prepare("SELECT id FROM admin_users LIMIT 1")
        .get();

      if (!existingAdmin) {
        const defaultUsername = process.env.DEFAULT_ADMIN_USERNAME || "admin";
        const defaultEmail =
          process.env.DEFAULT_ADMIN_EMAIL || "admin@example.com";
        const defaultPassword =
          process.env.DEFAULT_ADMIN_PASSWORD || "admin123456";

        await this.register({
          username: defaultUsername,
          email: defaultEmail,
          password: defaultPassword,
          confirmPassword: defaultPassword,
          role: "super_admin",
        });

        console.log(`✅ Default admin created: ${defaultUsername}`);
      }
    } catch (error) {
      console.error("Error creating default admin:", error);
    }
  }
}
