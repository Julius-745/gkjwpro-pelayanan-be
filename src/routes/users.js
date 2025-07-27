"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/users.ts
var hono_1 = require("hono");
var db_1 = require("../db");
var zod_1 = require("zod");
var users = new hono_1.Hono();
// Validation schemas
var createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    id_krw: zod_1.z.number().int().positive("KRW ID must be a positive integer"),
    id_category: zod_1.z.number().int().positive("Category ID must be a positive integer"),
    id_pelayanLevel: zod_1.z.number().int().positive("Pelayan Level ID must be a positive integer")
});
var updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required").optional(),
    id_krw: zod_1.z.number().int().positive("KRW ID must be a positive integer").optional(),
    id_category: zod_1.z.number().int().positive("Category ID must be a positive integer").optional(),
    id_pelayanLevel: zod_1.z.number().int().positive("Pelayan Level ID must be a positive integer").optional()
});
// Get all users with related data
users.get("/", function (c) {
    try {
        var stmt = db_1.default.prepare("\n      SELECT \n        u.id,\n        u.name,\n        u.id_krw,\n        u.id_category,\n        u.id_pelayanLevel,\n        u.createdAt,\n        u.updatedAt,\n        k.krw_name,\n        ic.categoryName,\n        pl.levelName\n      FROM users u\n      LEFT JOIN krw k ON u.id_krw = k.id\n      LEFT JOIN ibadahCategory ic ON u.id_category = ic.id\n      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id\n      ORDER BY u.createdAt DESC\n    ");
        var data = stmt.all();
        return c.json({ success: true, data: data });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch users" }, 500);
    }
});
// Get user by ID with related data
users.get("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid user ID" }, 400);
        }
        var stmt = db_1.default.prepare("\n      SELECT \n        u.id,\n        u.name,\n        u.id_krw,\n        u.id_category,\n        u.id_pelayanLevel,\n        u.createdAt,\n        u.updatedAt,\n        k.krw_name,\n        ic.categoryName,\n        pl.levelName\n      FROM users u\n      LEFT JOIN krw k ON u.id_krw = k.id\n      LEFT JOIN ibadahCategory ic ON u.id_category = ic.id\n      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id\n      WHERE u.id = ?\n    ");
        var user = stmt.get(id);
        if (!user) {
            return c.json({ success: false, error: "User not found" }, 404);
        }
        return c.json({ success: true, data: user });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch user" }, 500);
    }
});
// Create new user
users.post("/", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var body, validatedData, krwExists, categoryExists, levelExists, stmt, info, newUser, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = createUserSchema.parse(body);
                krwExists = db_1.default.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
                categoryExists = db_1.default.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_category);
                levelExists = db_1.default.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);
                if (!krwExists) {
                    return [2 /*return*/, c.json({ success: false, error: "KRW not found" }, 400)];
                }
                if (!categoryExists) {
                    return [2 /*return*/, c.json({ success: false, error: "Ibadah category not found" }, 400)];
                }
                if (!levelExists) {
                    return [2 /*return*/, c.json({ success: false, error: "Pelayan level not found" }, 400)];
                }
                stmt = db_1.default.prepare("\n      INSERT INTO users (name, id_krw, id_category, id_pelayanLevel) \n      VALUES (?, ?, ?, ?)\n    ");
                info = stmt.run(validatedData.name, validatedData.id_krw, validatedData.id_category, validatedData.id_pelayanLevel);
                newUser = db_1.default.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
                return [2 /*return*/, c.json({ success: true, data: newUser }, 201)];
            case 2:
                error_1 = _a.sent();
                if (error_1 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_1.errors }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to create user" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Update user
users.patch("/:id", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var id, body, validatedData, userExists, krwExists, categoryExists, levelExists, updates_1, values_1, stmt, updatedUser, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(c.req.param("id"));
                if (isNaN(id)) {
                    return [2 /*return*/, c.json({ success: false, error: "Invalid user ID" }, 400)];
                }
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = updateUserSchema.parse(body);
                userExists = db_1.default.prepare("SELECT id FROM users WHERE id = ?").get(id);
                if (!userExists) {
                    return [2 /*return*/, c.json({ success: false, error: "User not found" }, 404)];
                }
                // Validate foreign key references if provided
                if (validatedData.id_krw) {
                    krwExists = db_1.default.prepare("SELECT id FROM krw WHERE id = ?").get(validatedData.id_krw);
                    if (!krwExists) {
                        return [2 /*return*/, c.json({ success: false, error: "KRW not found" }, 400)];
                    }
                }
                if (validatedData.id_category) {
                    categoryExists = db_1.default.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_category);
                    if (!categoryExists) {
                        return [2 /*return*/, c.json({ success: false, error: "Ibadah category not found" }, 400)];
                    }
                }
                if (validatedData.id_pelayanLevel) {
                    levelExists = db_1.default.prepare("SELECT id FROM pelayanLevel WHERE id = ?").get(validatedData.id_pelayanLevel);
                    if (!levelExists) {
                        return [2 /*return*/, c.json({ success: false, error: "Pelayan level not found" }, 400)];
                    }
                }
                updates_1 = [];
                values_1 = [];
                Object.entries(validatedData).forEach(function (_a) {
                    var key = _a[0], value = _a[1];
                    if (value !== undefined) {
                        updates_1.push("".concat(key, " = ?"));
                        values_1.push(value);
                    }
                });
                if (updates_1.length === 0) {
                    return [2 /*return*/, c.json({ success: false, error: "No valid fields to update" }, 400)];
                }
                values_1.push(id);
                stmt = db_1.default.prepare("UPDATE users SET ".concat(updates_1.join(", "), " WHERE id = ?"));
                stmt.run.apply(stmt, values_1);
                updatedUser = db_1.default.prepare("SELECT * FROM users WHERE id = ?").get(id);
                return [2 /*return*/, c.json({ success: true, data: updatedUser })];
            case 2:
                error_2 = _a.sent();
                if (error_2 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_2.errors }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to update user" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Delete user
users.delete("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid user ID" }, 400);
        }
        var stmt = db_1.default.prepare("DELETE FROM users WHERE id = ?");
        var info = stmt.run(id);
        if (info.changes === 0) {
            return c.json({ success: false, error: "User not found" }, 404);
        }
        return c.json({ success: true, message: "User deleted successfully" });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to delete user" }, 500);
    }
});
exports.default = users;
