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
// routes/ibadah.ts
var hono_1 = require("hono");
var db_1 = require("../db");
var zod_1 = require("zod");
var ibadah = new hono_1.Hono();
var createIbadahSchema = zod_1.z.object({
    id_users: zod_1.z.number().int().positive("User ID must be a positive integer"),
    id_ibadahCategory: zod_1.z.number().int().positive("Ibadah Category ID must be a positive integer"),
    id_pelayanPosition: zod_1.z.number().int().positive("Pelayan Position ID must be a positive integer")
});
var updateIbadahSchema = zod_1.z.object({
    id_users: zod_1.z.number().int().positive("User ID must be a positive integer").optional(),
    id_ibadahCategory: zod_1.z.number().int().positive("Ibadah Category ID must be a positive integer").optional(),
    id_pelayanPosition: zod_1.z.number().int().positive("Pelayan Position ID must be a positive integer").optional()
});
// Get all ibadah with related data
ibadah.get("/", function (c) {
    try {
        var stmt = db_1.default.prepare("\n      SELECT \n        i.id,\n        i.id_users,\n        i.id_ibadahCategory,\n        i.id_pelayanPosition,\n        i.createdAt,\n        i.updatedAt,\n        u.name as userName,\n        ic.categoryName,\n        pp.name as positionName,\n        k.krw_name,\n        pl.levelName\n      FROM ibadah i\n      LEFT JOIN users u ON i.id_users = u.id\n      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id\n      LEFT JOIN pelayanPosition pp ON i.id_pelayanPosition = pp.id\n      LEFT JOIN krw k ON u.id_krw = k.id\n      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id\n      ORDER BY i.createdAt DESC\n    ");
        var data = stmt.all();
        return c.json({ success: true, data: data });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch ibadah data" }, 500);
    }
});
// Get ibadah by ID with related data
ibadah.get("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid ibadah ID" }, 400);
        }
        var stmt = db_1.default.prepare("\n      SELECT \n        i.id,\n        i.id_users,\n        i.id_ibadahCategory,\n        i.id_pelayanPosition,\n        i.createdAt,\n        i.updatedAt,\n        u.name as userName,\n        ic.categoryName,\n        pp.name as positionName,\n        k.krw_name,\n        pl.levelName\n      FROM ibadah i\n      LEFT JOIN users u ON i.id_users = u.id\n      LEFT JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id\n      LEFT JOIN pelayanPosition pp ON i.id_pelayanPosition = pp.id\n      LEFT JOIN krw k ON u.id_krw = k.id\n      LEFT JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id\n      WHERE i.id = ?\n    ");
        var ibadahData = stmt.get(id);
        if (!ibadahData) {
            return c.json({ success: false, error: "Ibadah not found" }, 404);
        }
        return c.json({ success: true, data: ibadahData });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch ibadah" }, 500);
    }
});
// Create new ibadah
ibadah.post("/", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var body, validatedData, userExists, categoryExists, positionExists, stmt, info, newIbadah, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = createIbadahSchema.parse(body);
                userExists = db_1.default.prepare("SELECT id FROM users WHERE id = ?").get(validatedData.id_users);
                categoryExists = db_1.default.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
                positionExists = db_1.default.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validatedData.id_pelayanPosition);
                if (!userExists) {
                    return [2 /*return*/, c.json({ success: false, error: "User not found" }, 400)];
                }
                if (!categoryExists) {
                    return [2 /*return*/, c.json({ success: false, error: "Ibadah category not found" }, 400)];
                }
                if (!positionExists) {
                    return [2 /*return*/, c.json({ success: false, error: "Pelayan position not found" }, 400)];
                }
                stmt = db_1.default.prepare("\n      INSERT INTO ibadah (id_users, id_ibadahCategory, id_pelayanPosition) \n      VALUES (?, ?, ?)\n    ");
                info = stmt.run(validatedData.id_users, validatedData.id_ibadahCategory, validatedData.id_pelayanPosition);
                newIbadah = db_1.default.prepare("SELECT * FROM ibadah WHERE id = ?").get(info.lastInsertRowid);
                return [2 /*return*/, c.json({ success: true, data: newIbadah }, 201)];
            case 2:
                error_1 = _a.sent();
                if (error_1 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_1.errors }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to create ibadah" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Update ibadah
ibadah.patch("/:id", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var id, body, validatedData, ibadahExists, userExists, categoryExists, positionExists, updates_1, values_1, stmt, updatedIbadah, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(c.req.param("id"));
                if (isNaN(id)) {
                    return [2 /*return*/, c.json({ success: false, error: "Invalid ibadah ID" }, 400)];
                }
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = updateIbadahSchema.parse(body);
                ibadahExists = db_1.default.prepare("SELECT id FROM ibadah WHERE id = ?").get(id);
                if (!ibadahExists) {
                    return [2 /*return*/, c.json({ success: false, error: "Ibadah not found" }, 404)];
                }
                // Validate foreign key references if provided
                if (validatedData.id_users) {
                    userExists = db_1.default.prepare("SELECT id FROM users WHERE id = ?").get(validatedData.id_users);
                    if (!userExists) {
                        return [2 /*return*/, c.json({ success: false, error: "User not found" }, 400)];
                    }
                }
                if (validatedData.id_ibadahCategory) {
                    categoryExists = db_1.default.prepare("SELECT id FROM ibadahCategory WHERE id = ?").get(validatedData.id_ibadahCategory);
                    if (!categoryExists) {
                        return [2 /*return*/, c.json({ success: false, error: "Ibadah category not found" }, 400)];
                    }
                }
                if (validatedData.id_pelayanPosition) {
                    positionExists = db_1.default.prepare("SELECT id FROM pelayanPosition WHERE id = ?").get(validatedData.id_pelayanPosition);
                    if (!positionExists) {
                        return [2 /*return*/, c.json({ success: false, error: "Pelayan position not found" }, 400)];
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
                stmt = db_1.default.prepare("UPDATE ibadah SET ".concat(updates_1.join(", "), " WHERE id = ?"));
                stmt.run.apply(stmt, values_1);
                updatedIbadah = db_1.default.prepare("SELECT * FROM ibadah WHERE id = ?").get(id);
                return [2 /*return*/, c.json({ success: true, data: updatedIbadah })];
            case 2:
                error_2 = _a.sent();
                if (error_2 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_2.errors }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to update ibadah" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Delete ibadah
ibadah.delete("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid ibadah ID" }, 400);
        }
        var stmt = db_1.default.prepare("DELETE FROM ibadah WHERE id = ?");
        var info = stmt.run(id);
        if (info.changes === 0) {
            return c.json({ success: false, error: "Ibadah not found" }, 404);
        }
        return c.json({ success: true, message: "Ibadah deleted successfully" });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to delete ibadah" }, 500);
    }
});
exports.default = ibadah;
