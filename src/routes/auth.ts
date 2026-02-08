import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { AuthService } from "../services/authService";
import type { AppEnv } from "../types/hono";

const auth = new OpenAPIHono<AppEnv>();

// Schemas
const LoginResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().optional(),
  user: z
    .object({
      id: z.number(),
      username: z.string(),
      email: z.string(),
      role: z.string(),
    })
    .optional(),
  message: z.string().optional(),
});

const RegisterResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

// Routes Definition
const loginRoute = createRoute({
  method: "post",
  path: "/login",
  summary: "User login",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email(),
            password: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: LoginResponseSchema } },
      description: "Login successful",
    },
    401: {
      content: { "application/json": { schema: LoginResponseSchema } },
      description: "Invalid credentials",
    },
    400: {
      content: { "application/json": { schema: LoginResponseSchema } },
      description: "Bad Request",
    },
  },
});

const registerRoute = createRoute({
  method: "post",
  path: "/register",
  summary: "User registration",
  tags: ["Authentication"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            username: z.string().min(3),
            email: z.string().email(),
            password: z.string().min(8),
            confirmPassword: z.string(),
            role: z.enum(["super_admin", "admin", "user"]).default("user"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: RegisterResponseSchema } },
      description: "Registration successful",
    },
    400: {
      content: { "application/json": { schema: RegisterResponseSchema } },
      description: "Bad Request",
    },
  },
});

const profileRoute = createRoute({
  method: "get",
  path: "/profile",
  summary: "Get current user profile",
  tags: ["Authentication"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            user: z.object({
              id: z.number(),
              username: z.string(),
              email: z.string(),
              role: z.string(),
              isActive: z.boolean(),
            }),
          }),
        },
      },
      description: "Profile retrieved successfully",
    },
    401: {
      description: "Unauthorized",
    },
  },
});

const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  summary: "User logout",
  tags: ["Authentication"],
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
      description: "Logged out successfully",
    },
    401: {
      description: "Unauthorized",
    },
  },
});

auth.openapi(registerRoute, async (c) => {
  const body = c.req.valid("json");
  const result = await AuthService.register({
    ...body,
    confirmPassword: body.confirmPassword,
  });
  const status = result.success ? 201 : 400;
  return c.json(
    {
      success: result.success,
      message: result.message,
    },
    status,
  );
});

auth.openapi(loginRoute, async (c) => {
  const body = c.req.valid("json");
  const result = await AuthService.login({
    username: body.email, // AuthService uses 'username' parameter but it actually accepts email
    password: body.password,
  });

  if (result.success) {
    return c.json(
      {
        success: true,
        token: result.token,
        user: result.user
          ? {
              id: result.user.id ?? 0,
              username: result.user.username ?? "",
              email: result.user.email ?? "",
              role: result.user.role ?? "user",
            }
          : undefined,
      },
      200,
    );
  } else {
    return c.json(
      {
        success: false,
        message: result.message,
      },
      401,
    );
  }
});

auth.openapi(profileRoute, async (c) => {
  const user = c.get("user");
  return c.json(
    {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    },
    200,
  );
});

auth.openapi(logoutRoute, async (c) => {
  return c.json(
    {
      success: true,
      message: "Logged out successfully",
    },
    200,
  );
});

export default auth;
