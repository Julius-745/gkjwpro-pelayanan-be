import db from '../db';

// --- Seed pelayanLevel ---
const pelayanLevels = [
  { levelName: 'Pendeta' },
  { levelName: 'Penatua' },
  { levelName: 'Diaken' },
  { levelName: 'Panutan' },
  { levelName: 'Bapak' },
  { levelName: 'Ibu' },
  { levelName: 'Saudara' },
  { levelName: 'Saudari' },
];
for (const level of pelayanLevels) {
  db.prepare(
    `INSERT OR IGNORE INTO pelayanLevel (levelName) VALUES (?)`
  ).run(level.levelName);
}

// --- Seed pelayanPosition ---
const pelayanPositions = [
  { positionName: 'Pelayan' },
  { positionName: 'Operator LCD' },
  { positionName: 'Organis' },
  { positionName: 'Song Leader' },
  { positionName: 'Balita' },
  { positionName: 'Pratama' },
  { positionName: 'Madya' },
  { positionName: 'Remaja' },
  { positionName: 'Pelayan Firman' },
  { positionName: 'Pendamping' },
];
for (const pos of pelayanPositions) {
  db.prepare(
    `INSERT OR IGNORE INTO pelayanPosition (positionName) VALUES (?)`
  ).run(pos.positionName);
}

// --- Seed ibadahCategory ---
const ibadahCategories = [
  { categoryName: 'Ibadah Raya I' },
  { categoryName: 'Ibadah Raya II' },
  { categoryName: 'KRW Sukapura' },
];
for (const cat of ibadahCategories) {
  db.prepare(
    `INSERT OR IGNORE INTO ibadahCategory (categoryName) VALUES (?)`
  ).run(cat.categoryName);
}

// --- Seed krw ---
const krws = [
  { krw_name: 'Main Service' },
  { krw_name: 'Sukapura' },
];
for (const krw of krws) {
  db.prepare(
    `INSERT OR IGNORE INTO krw (krw_name) VALUES (?)`
  ).run(krw.krw_name);
}

// --- Get reference IDs for users ---
const mainServiceKRW = (db.prepare('SELECT id FROM krw WHERE krw_name = ?').get('Main Service') as { id?: number } | undefined)?.id;
const sukapuraKRW = (db.prepare('SELECT id FROM krw WHERE krw_name = ?').get('Sukapura') as { id?: number } | undefined)?.id;

const ibadahRaya1 = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Ibadah Raya I') as { id?: number } | undefined)?.id;
const ibadahRaya2 = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Ibadah Raya II') as { id?: number } | undefined)?.id;
const krwSukapura = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('KRW Sukapura') as { id?: number } | undefined)?.id;

const pendeta = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Pendeta') as { id?: number } | undefined)?.id;
const penatua = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Penatua') as { id?: number } | undefined)?.id;
const diaken = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Diaken') as { id?: number } | undefined)?.id;
const panutan = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Panutan') as { id?: number } | undefined)?.id;
const bapak = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Bapak') as { id?: number } | undefined)?.id;
const ibu = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Ibu') as { id?: number } | undefined)?.id;
const saudara = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Saudara') as { id?: number } | undefined)?.id;
const saudari = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Saudari') as { id?: number } | undefined)?.id;

// --- Seed users ---
if (mainServiceKRW && sukapuraKRW && ibadahRaya1 && ibadahRaya2 && krwSukapura && 
    pendeta && penatua && diaken && panutan && bapak && ibu && saudara && saudari) {
  
  const users = [
    // Main Service participants for Ibadah Raya I & II
    { name: 'Pdt.Argo Daniel Satwiko', id_krw: mainServiceKRW, id_pelayanLevel: pendeta },
    { name: 'Sdri.Vani Gian K.', id_krw: mainServiceKRW,  id_pelayanLevel: saudari },
    { name: 'Bp.Prijo Djatmiko', id_krw: mainServiceKRW,  id_pelayanLevel: bapak },
    { name: 'Ibu Sri Purwanti', id_krw: mainServiceKRW,  id_pelayanLevel: ibu },
    { name: 'Ibu Rully Aprilia', id_krw: mainServiceKRW,  id_pelayanLevel: ibu },
    { name: 'Ibu Elis Setiyaningsih', id_krw: mainServiceKRW,  id_pelayanLevel: ibu },
    { name: 'Sdri.Chrisnanda Yemima Putri', id_krw: mainServiceKRW,  id_pelayanLevel: saudari },
    { name: 'Ibu Sri Winarsih', id_krw: mainServiceKRW,  id_pelayanLevel: ibu },
    { name: 'Pnt.Triana Koeshartatik', id_krw: mainServiceKRW,  id_pelayanLevel: panutan },
    { name: 'Dkn.Eunike Agrivina Kristi', id_krw: mainServiceKRW,  id_pelayanLevel: diaken },
    { name: 'Sdr.Raffa', id_krw: mainServiceKRW, id_ibadahCategory: ibadahRaya2, id_pelayanLevel: saudara },
    { name: 'Ibu Sih Mahanani', id_krw: mainServiceKRW, id_ibadahCategory: ibadahRaya2, id_pelayanLevel: ibu },
    { name: 'Bp.Wimba Nugraha A.', id_krw: mainServiceKRW, id_ibadahCategory: ibadahRaya2, id_pelayanLevel: bapak },
    { name: 'Ibu Anindita Citta K.', id_krw: mainServiceKRW, id_ibadahCategory: ibadahRaya2, id_pelayanLevel: ibu },
    
    // KRW Sukapura participants
    { name: 'Pnt.Juni Wandi Purba', id_krw: sukapuraKRW, id_ibadahCategory: krwSukapura, id_pelayanLevel: panutan },
    { name: 'Pnt.Maria Widiastuti', id_krw: sukapuraKRW, id_ibadahCategory: krwSukapura, id_pelayanLevel: panutan },
    { name: 'Dkn.Debora Glestin R.', id_krw: sukapuraKRW, id_ibadahCategory: krwSukapura, id_pelayanLevel: diaken },
    { name: 'Bp.Riski Nugraha M.P', id_krw: sukapuraKRW, id_ibadahCategory: krwSukapura, id_pelayanLevel: bapak },
    { name: 'Ibu Nuri Hutami', id_krw: sukapuraKRW, id_ibadahCategory: krwSukapura, id_pelayanLevel: ibu },
  ];

  for (const user of users) {
    db.prepare(
      `INSERT OR IGNORE INTO users (name, id_krw, id_pelayanLevel) VALUES (?, ?, ?)`
    ).run(user.name, user.id_krw, user.id_pelayanLevel);
  }
}

// --- Get position IDs for ibadah assignments ---
const pelayanPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pelayan') as { id?: number } | undefined)?.id;
const operatorPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Operator LCD') as { id?: number } | undefined)?.id;
const organisPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Organis') as { id?: number } | undefined)?.id;
const songLeaderPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Song Leader') as { id?: number } | undefined)?.id;
const balitaPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Balita') as { id?: number } | undefined)?.id;
const pratamaPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pratama') as { id?: number } | undefined)?.id;
const madyaPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Madya') as { id?: number } | undefined)?.id;
const remajaPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Remaja') as { id?: number } | undefined)?.id;
const pelayanFirmanPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pelayan Firman') as { id?: number } | undefined)?.id;
const pendampingPos = (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pendamping') as { id?: number } | undefined)?.id;

// --- Helper function to get next Sunday from a given date ---
function getNextSunday(date: Date): Date {
  const nextSunday = new Date(date);
  nextSunday.setDate(date.getDate() + (7 - date.getDay()));
  return nextSunday;
}

// --- Helper function to format date for database (YYYY-MM-DD) ---
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] as string;
}

// --- Seed ibadah (service assignments) with dates ---
if (ibadahRaya1 && ibadahRaya2 && krwSukapura && pelayanPos && operatorPos && 
    organisPos && songLeaderPos && balitaPos && pratamaPos && madyaPos && 
    remajaPos && pelayanFirmanPos && pendampingPos) {

  // Generate dates for the next few Sundays
  const today = new Date();
  const nextSunday = getNextSunday(today);
  
  // Create dates for multiple weeks
  const dates = {
    week1: formatDate(nextSunday),
    week2: formatDate(new Date(nextSunday.getTime() + 7 * 24 * 60 * 60 * 1000)),
    week3: formatDate(new Date(nextSunday.getTime() + 14 * 24 * 60 * 60 * 1000)),
    week4: formatDate(new Date(nextSunday.getTime() + 21 * 24 * 60 * 60 * 1000)),
  };

  // Service assignments with dates
  const serviceAssignments = [
    // Week 1 - Ibadah Raya I
    { userName: 'Pdt.Argo Daniel Satwiko', categoryId: ibadahRaya1, positionId: pelayanPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Sdri.Vani Gian K.', categoryId: ibadahRaya1, positionId: operatorPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Bp.Prijo Djatmiko', categoryId: ibadahRaya1, positionId: organisPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Ibu Sri Purwanti', categoryId: ibadahRaya1, positionId: songLeaderPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Ibu Rully Aprilia', categoryId: ibadahRaya1, positionId: songLeaderPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Ibu Elis Setiyaningsih', categoryId: ibadahRaya1, positionId: balitaPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Sdri.Chrisnanda Yemima Putri', categoryId: ibadahRaya1, positionId: balitaPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Ibu Sri Winarsih', categoryId: ibadahRaya1, positionId: pratamaPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Pnt.Triana Koeshartatik', categoryId: ibadahRaya1, positionId: madyaPos, serviceDate: dates.week1, serviceTime: '08:00' },
    { userName: 'Dkn.Eunike Agrivina Kristi', categoryId: ibadahRaya1, positionId: remajaPos, serviceDate: dates.week1, serviceTime: '08:00' },
    
    // Week 1 - Ibadah Raya II
    { userName: 'Pdt.Argo Daniel Satwiko', categoryId: ibadahRaya2, positionId: pelayanPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Sdr.Raffa', categoryId: ibadahRaya2, positionId: operatorPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Ibu Sih Mahanani', categoryId: ibadahRaya2, positionId: organisPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Bp.Wimba Nugraha A.', categoryId: ibadahRaya2, positionId: songLeaderPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Ibu Anindita Citta K.', categoryId: ibadahRaya2, positionId: songLeaderPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Ibu Elis Setiyaningsih', categoryId: ibadahRaya2, positionId: balitaPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Sdri.Chrisnanda Yemima Putri', categoryId: ibadahRaya2, positionId: balitaPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Ibu Sri Winarsih', categoryId: ibadahRaya2, positionId: pratamaPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Pnt.Triana Koeshartatik', categoryId: ibadahRaya2, positionId: madyaPos, serviceDate: dates.week1, serviceTime: '10:30' },
    { userName: 'Dkn.Eunike Agrivina Kristi', categoryId: ibadahRaya2, positionId: remajaPos, serviceDate: dates.week1, serviceTime: '10:30' },
    
    // Week 1 - KRW Sukapura
    { userName: 'Pnt.Juni Wandi Purba', categoryId: krwSukapura, positionId: pelayanFirmanPos, serviceDate: dates.week1, serviceTime: '16:00' },
    { userName: 'Pnt.Maria Widiastuti', categoryId: krwSukapura, positionId: pendampingPos, serviceDate: dates.week1, serviceTime: '16:00' },
    { userName: 'Dkn.Debora Glestin R.', categoryId: krwSukapura, positionId: pendampingPos, serviceDate: dates.week1, serviceTime: '16:00' },
    { userName: 'Bp.Riski Nugraha M.P', categoryId: krwSukapura, positionId: organisPos, serviceDate: dates.week1, serviceTime: '16:00' },
    { userName: 'Ibu Nuri Hutami', categoryId: krwSukapura, positionId: songLeaderPos, serviceDate: dates.week1, serviceTime: '16:00' },

    // Week 2 - Repeat assignments for next week
    { userName: 'Pdt.Argo Daniel Satwiko', categoryId: ibadahRaya1, positionId: pelayanPos, serviceDate: dates.week2, serviceTime: '08:00' },
    { userName: 'Sdri.Vani Gian K.', categoryId: ibadahRaya1, positionId: operatorPos, serviceDate: dates.week2, serviceTime: '08:00' },
    { userName: 'Bp.Prijo Djatmiko', categoryId: ibadahRaya1, positionId: organisPos, serviceDate: dates.week2, serviceTime: '08:00' },
    { userName: 'Ibu Sri Purwanti', categoryId: ibadahRaya1, positionId: songLeaderPos, serviceDate: dates.week2, serviceTime: '08:00' },
    
    { userName: 'Pdt.Argo Daniel Satwiko', categoryId: ibadahRaya2, positionId: pelayanPos, serviceDate: dates.week2, serviceTime: '10:30' },
    { userName: 'Sdr.Raffa', categoryId: ibadahRaya2, positionId: operatorPos, serviceDate: dates.week2, serviceTime: '10:30' },
    { userName: 'Ibu Sih Mahanani', categoryId: ibadahRaya2, positionId: organisPos, serviceDate: dates.week2, serviceTime: '10:30' },
    
    { userName: 'Pnt.Juni Wandi Purba', categoryId: krwSukapura, positionId: pelayanFirmanPos, serviceDate: dates.week2, serviceTime: '16:00' },
    { userName: 'Bp.Riski Nugraha M.P', categoryId: krwSukapura, positionId: organisPos, serviceDate: dates.week2, serviceTime: '16:00' },
  ];

  const ibadahIdStmt = db.prepare(
    `INSERT OR IGNORE INTO ibadah (id_ibadahCategory, service_date, service_time) VALUES (?, ?, ?)`
  );

  // --- Insert assignment (user ↔ ibadah ↔ position) ---
  const assignmentStmt = db.prepare(
    `INSERT OR IGNORE INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition) VALUES (?, ?, ?)`
  );

  for (const assignment of serviceAssignments) {
  // 1. Ensure ibadah event exists
  ibadahIdStmt.run(assignment.categoryId, assignment.serviceDate, assignment.serviceTime);

  // 2. Get ibadah.id for this event
  const ibadahId = (db.prepare(
    `SELECT id FROM ibadah WHERE id_ibadahCategory = ? AND service_date = ? AND service_time = ?`
  ).get(assignment.categoryId, assignment.serviceDate, assignment.serviceTime) as { id?: number } | undefined)?.id;

  // 3. Get user.id
  const userId = (db.prepare(`SELECT id FROM users WHERE name = ?`).get(assignment.userName) as { id?: number } | undefined)?.id;

  if (ibadahId && userId) {
    assignmentStmt.run(ibadahId, userId, assignment.positionId);
  }
}
}

console.log('✅ Church service seeding with dates done!');

// Verification query with dates
const verifyQuery = db.prepare(`
  SELECT 
  i.service_date,
  i.service_time,
  ic.categoryName as service_category,
  u.name as user_name,
  pl.levelName as user_level,
  pp.positionName as service_position,
  k.krw_name
FROM ibadah i
JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
JOIN ibadah_assignments ia ON i.id = ia.id_ibadah
JOIN users u ON ia.id_users = u.id
JOIN krw k ON u.id_krw = k.id
JOIN pelayanLevel pl ON u.id_pelayanLevel = pl.id
JOIN pelayanPosition pp ON ia.id_pelayanPosition = pp.id
ORDER BY i.service_date, i.service_time, ic.categoryName, pp.positionName;
`);

const results = verifyQuery.all();
console.log('\n📋 Service Assignments Created with Dates:');
console.table(results);

// Summary by date
const summaryQuery = db.prepare(`
  SELECT 
    i.service_date,
    i.service_time,
    ic.categoryName as service_category,
    COUNT(ia.id) as total_assignments
  FROM ibadah i
  JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  LEFT JOIN ibadah_assignments ia ON i.id = ia.id_ibadah
  GROUP BY i.id, i.service_date, i.service_time, ic.categoryName
  ORDER BY i.service_date, i.service_time;
`);

const summary = summaryQuery.all();
console.log('\n📅 Service Schedule Summary:');
console.table(summary);

db.close();