import Database from "better-sqlite3";

const db = new Database("app.db");

// Create tables with proper relationships and constraints
db.prepare(`
  CREATE TABLE IF NOT EXISTS pelayanLevel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    levelName TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS pelayanPosition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    positionName TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS ibadahCategory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoryName TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS krw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    krw_name TEXT NOT NULL UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    id_krw INTEGER NOT NULL,
    id_pelayanLevel INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_krw) REFERENCES krw(id) ON DELETE RESTRICT,
    FOREIGN KEY (id_pelayanLevel) REFERENCES pelayanLevel(id) ON DELETE RESTRICT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS ibadah (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_ibadahCategory INTEGER NOT NULL,
  service_date DATE NOT NULL,
  service_time TIME NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_ibadahCategory) REFERENCES ibadahCategory(id) ON DELETE RESTRICT
);`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS ibadah_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_ibadah INTEGER NOT NULL,
  id_users INTEGER NOT NULL,
  id_pelayanPosition INTEGER NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_ibadah) REFERENCES ibadah(id) ON DELETE CASCADE,
  FOREIGN KEY (id_users) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_pelayanPosition) REFERENCES pelayanPosition(id) ON DELETE RESTRICT
);`).run();

// Enable foreign key constraints
db.pragma("foreign_keys = ON");

db.prepare(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    isActive BOOLEAN DEFAULT 1,
    lastLogin DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_admin_users_updatedAt 
  AFTER UPDATE ON admin_users
  BEGIN
    UPDATE admin_users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

// Create indexes for better performance
db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_krw ON users(id_krw)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_users_level ON users(id_pelayanLevel)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_ibadah_category ON ibadah(id_ibadahCategory)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_ibadah_assignments_ibadah ON ibadah_assignments(id_ibadah)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_ibadah_assignments_users ON ibadah_assignments(id_users)`).run();
db.prepare(`CREATE INDEX IF NOT EXISTS idx_ibadah_assignments_position ON ibadah_assignments(id_pelayanPosition)`).run();


// Create triggers for updating updatedAt timestamp
db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_pelayanLevel_updatedAt 
  AFTER UPDATE ON pelayanLevel
  BEGIN
    UPDATE pelayanLevel SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_pelayanPosition_updatedAt 
  AFTER UPDATE ON pelayanPosition
  BEGIN
    UPDATE pelayanPosition SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_ibadahCategory_updatedAt 
  AFTER UPDATE ON ibadahCategory
  BEGIN
    UPDATE ibadahCategory SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_krw_updatedAt 
  AFTER UPDATE ON krw
  BEGIN
    UPDATE krw SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_users_updatedAt 
  AFTER UPDATE ON users
  BEGIN
    UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.prepare(`
  CREATE TRIGGER IF NOT EXISTS update_ibadah_updatedAt 
  AFTER UPDATE ON ibadah
  BEGIN
    UPDATE ibadah SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END
`).run();

db.pragma('journal_mode = WAL');   
db.pragma('synchronous = NORMAL');  
db.pragma('cache_size = 1000000');   
db.pragma('temp_store = MEMORY'); 

export default db;