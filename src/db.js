"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var better_sqlite3_1 = require("better-sqlite3");
var db = new better_sqlite3_1.default("app.db");
// Enable foreign key constraints
db.pragma("foreign_keys = ON");
// Create tables with proper relationships and constraints
db.prepare("\n  CREATE TABLE IF NOT EXISTS pelayanLevel (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    levelName TEXT NOT NULL UNIQUE,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n  )\n").run();
db.prepare("\n  CREATE TABLE IF NOT EXISTS pelayanPosition (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL UNIQUE,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n  )\n").run();
db.prepare("\n  CREATE TABLE IF NOT EXISTS ibadahCategory (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    categoryName TEXT NOT NULL UNIQUE,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n  )\n").run();
db.prepare("\n  CREATE TABLE IF NOT EXISTS krw (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    krw_name TEXT NOT NULL UNIQUE,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP\n  )\n").run();
db.prepare("\n  CREATE TABLE IF NOT EXISTS users (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    name TEXT NOT NULL,\n    id_krw INTEGER NOT NULL,\n    id_category INTEGER NOT NULL,\n    id_pelayanLevel INTEGER NOT NULL,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (id_krw) REFERENCES krw(id) ON DELETE RESTRICT,\n    FOREIGN KEY (id_category) REFERENCES ibadahCategory(id) ON DELETE RESTRICT,\n    FOREIGN KEY (id_pelayanLevel) REFERENCES pelayanLevel(id) ON DELETE RESTRICT\n  )\n").run();
db.prepare("\n  CREATE TABLE IF NOT EXISTS ibadah (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    id_users INTEGER NOT NULL,\n    id_ibadahCategory INTEGER NOT NULL,\n    id_pelayanPosition INTEGER NOT NULL,\n    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,\n    FOREIGN KEY (id_users) REFERENCES users(id) ON DELETE CASCADE,\n    FOREIGN KEY (id_ibadahCategory) REFERENCES ibadahCategory(id) ON DELETE RESTRICT,\n    FOREIGN KEY (id_pelayanPosition) REFERENCES pelayanPosition(id) ON DELETE RESTRICT\n  )\n").run();
// Create indexes for better performance
db.prepare("CREATE INDEX IF NOT EXISTS idx_users_krw ON users(id_krw)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_users_category ON users(id_category)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_users_level ON users(id_pelayanLevel)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_ibadah_users ON ibadah(id_users)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_ibadah_category ON ibadah(id_ibadahCategory)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_ibadah_position ON ibadah(id_pelayanPosition)").run();
// Create triggers for updating updatedAt timestamp
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_pelayanLevel_updatedAt \n  AFTER UPDATE ON pelayanLevel\n  BEGIN\n    UPDATE pelayanLevel SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_pelayanPosition_updatedAt \n  AFTER UPDATE ON pelayanPosition\n  BEGIN\n    UPDATE pelayanPosition SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_ibadahCategory_updatedAt \n  AFTER UPDATE ON ibadahCategory\n  BEGIN\n    UPDATE ibadahCategory SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_krw_updatedAt \n  AFTER UPDATE ON krw\n  BEGIN\n    UPDATE krw SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_users_updatedAt \n  AFTER UPDATE ON users\n  BEGIN\n    UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
db.prepare("\n  CREATE TRIGGER IF NOT EXISTS update_ibadah_updatedAt \n  AFTER UPDATE ON ibadah\n  BEGIN\n    UPDATE ibadah SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;\n  END\n").run();
exports.default = db;
