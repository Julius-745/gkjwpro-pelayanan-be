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
// routes/krw.ts
var hono_1 = require("hono");
var db_1 = require("../db");
var zod_1 = require("zod");
var krw = new hono_1.Hono();
var createKrwSchema = zod_1.z.object({
    krw_name: zod_1.z.string().min(1, "KRW name is required")
});
krw.get("/", function (c) {
    try {
        var stmt = db_1.default.prepare("SELECT * FROM krw ORDER BY createdAt DESC");
        var data = stmt.all();
        return c.json({ success: true, data: data });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch KRW data" }, 500);
    }
});
krw.get("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid KRW ID" }, 400);
        }
        var stmt = db_1.default.prepare("SELECT * FROM krw WHERE id = ?");
        var krwData = stmt.get(id);
        if (!krwData) {
            return c.json({ success: false, error: "KRW not found" }, 404);
        }
        return c.json({ success: true, data: krwData });
    }
    catch (error) {
        return c.json({ success: false, error: "Failed to fetch KRW" }, 500);
    }
});
krw.post("/", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var body, validatedData, stmt, info, newKrw, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = createKrwSchema.parse(body);
                stmt = db_1.default.prepare("INSERT INTO krw (krw_name) VALUES (?)");
                info = stmt.run(validatedData.krw_name);
                newKrw = db_1.default.prepare("SELECT * FROM krw WHERE id = ?").get(info.lastInsertRowid);
                return [2 /*return*/, c.json({ success: true, data: newKrw }, 201)];
            case 2:
                error_1 = _a.sent();
                if (error_1 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_1.errors }, 400)];
                }
                /* @ts-expect-error: "type error" */
                if (error_1.code === "SQLITE_CONSTRAINT_UNIQUE") {
                    return [2 /*return*/, c.json({ success: false, error: "KRW name already exists" }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to create KRW" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
krw.patch("/:id", function (c) { return __awaiter(void 0, void 0, void 0, function () {
    var id, body, validatedData, stmt, info, updatedKrw, error_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = parseInt(c.req.param("id"));
                if (isNaN(id)) {
                    return [2 /*return*/, c.json({ success: false, error: "Invalid KRW ID" }, 400)];
                }
                return [4 /*yield*/, c.req.json()];
            case 1:
                body = _a.sent();
                validatedData = createKrwSchema.parse(body);
                stmt = db_1.default.prepare("UPDATE krw SET krw_name = ? WHERE id = ?");
                info = stmt.run(validatedData.krw_name, id);
                if (info.changes === 0) {
                    return [2 /*return*/, c.json({ success: false, error: "KRW not found" }, 404)];
                }
                updatedKrw = db_1.default.prepare("SELECT * FROM krw WHERE id = ?").get(id);
                return [2 /*return*/, c.json({ success: true, data: updatedKrw })];
            case 2:
                error_2 = _a.sent();
                if (error_2 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, c.json({ success: false, error: error_2.errors }, 400)];
                }
                /* @ts-expect-error: "type error" */
                if (error_2.code === "SQLITE_CONSTRAINT_UNIQUE") {
                    return [2 /*return*/, c.json({ success: false, error: "KRW name already exists" }, 400)];
                }
                return [2 /*return*/, c.json({ success: false, error: "Failed to update KRW" }, 500)];
            case 3: return [2 /*return*/];
        }
    });
}); });
krw.delete("/:id", function (c) {
    try {
        var id = parseInt(c.req.param("id"));
        if (isNaN(id)) {
            return c.json({ success: false, error: "Invalid KRW ID" }, 400);
        }
        var stmt = db_1.default.prepare("DELETE FROM krw WHERE id = ?");
        var info = stmt.run(id);
        if (info.changes === 0) {
            return c.json({ success: false, error: "KRW not found" }, 404);
        }
        return c.json({ success: true, message: "KRW deleted successfully" });
    }
    catch (error) {
        /* @ts-expect-error: "type error" */
        if (error.code === "SQLITE_CONSTRAINT_FOREIGNKEY") {
            return c.json({ success: false, error: "Cannot delete KRW that is referenced by users" }, 400);
        }
        return c.json({ success: false, error: "Failed to delete KRW" }, 500);
    }
});
exports.default = krw;
