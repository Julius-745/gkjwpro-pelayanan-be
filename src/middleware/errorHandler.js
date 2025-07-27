"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
var http_exception_1 = require("hono/http-exception");
var logger_1 = require("../utils/logger");
var errorHandler = function (err, c) {
    logger_1.logger.error("Application error:", err);
    if (err instanceof http_exception_1.HTTPException) {
        return c.json({
            success: false,
            error: err.message,
            status: err.status
        }, err.status);
    }
    // Database constraint errors
    if (err.message.includes("SQLITE_CONSTRAINT")) {
        if (err.message.includes("UNIQUE")) {
            return c.json({ success: false, error: "Duplicate entry found" }, 400);
        }
        if (err.message.includes("FOREIGN KEY")) {
            return c.json({ success: false, error: "Referenced record not found" }, 400);
        }
    }
    // Generic server error
    return c.json(__assign({ success: false, error: "Internal server error" }, (process.env.NODE_ENV === "development" && { details: err.message })), 500);
};
exports.errorHandler = errorHandler;
