import db from '../db';

// --- Seed pelayanLevel ---
const pelayanLevels = [
  { levelName: 'Admin' },
  { levelName: 'Pendeta' },
  { levelName: 'Penatua' },
  { levelName: 'Diaken' },
];
for (const level of pelayanLevels) {
  db.prepare(
    `INSERT OR IGNORE INTO pelayanLevel (levelName) VALUES (?)`
  ).run(level.levelName);
}

// --- Seed pelayanPosition ---
const pelayanPositions = [
  { name: 'Liturgos' },
  { name: 'Pemusik' },
  { name: 'Singer' },
  { name: 'Operator' },
];
for (const pos of pelayanPositions) {
  db.prepare(
    `INSERT OR IGNORE INTO pelayanPosition (name) VALUES (?)`
  ).run(pos.name);
}

// --- Seed ibadahCategory ---
const ibadahCategories = [
  { categoryName: 'Umum' },
  { categoryName: 'Remaja' },
  { categoryName: 'Pemuda' },
  { categoryName: 'Anak' },
];
for (const cat of ibadahCategories) {
  db.prepare(
    `INSERT OR IGNORE INTO ibadahCategory (categoryName) VALUES (?)`
  ).run(cat.categoryName);
}

// --- Seed krw ---
const krws = [
  { krw_name: 'KRW 1' },
  { krw_name: 'KRW 2' },
  { krw_name: 'KRW 3' },
];
for (const krw of krws) {
  db.prepare(
    `INSERT OR IGNORE INTO krw (krw_name) VALUES (?)`
  ).run(krw.krw_name);
}

// --- Seed users (requires krw, ibadahCategory, pelayanLevel) ---
const krw1 = (db.prepare('SELECT id FROM krw WHERE krw_name = ?').get('KRW 1') as { id?: number } | undefined)?.id;
const catUmum = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Umum') as { id?: number } | undefined)?.id;
const levelAdmin = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Admin') as { id?: number } | undefined)?.id;

if (krw1 && catUmum && levelAdmin) {
  db.prepare(
    `INSERT OR IGNORE INTO users (name, id_krw, id_category, id_pelayanLevel) VALUES (?, ?, ?, ?)`
  ).run('Super Admin', krw1, catUmum, levelAdmin);
}

// --- Seed ibadah (requires users, ibadahCategory, pelayanPosition) ---
const user1 = (db.prepare('SELECT id FROM users WHERE name = ?').get('Super Admin') as { id?: number } | undefined)?.id;
const posLiturgos = (db.prepare('SELECT id FROM pelayanPosition WHERE name = ?').get('Liturgos') as { id?: number } | undefined)?.id;

if (user1 && catUmum && posLiturgos) {
  db.prepare(
    `INSERT OR IGNORE INTO ibadah (id_users, id_ibadahCategory, id_pelayanPosition) VALUES (?, ?, ?)`
  ).run(user1, catUmum, posLiturgos);
}

console.log('Seeding done!');
db.close();