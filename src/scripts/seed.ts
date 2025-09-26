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
  { positionName: 'Pelayan Firman' },
  { positionName: 'Pendamping/Koordinator Ibadah' },
  { positionName: 'Pandu Warta' },
  { positionName: 'Lektor 1' },
  { positionName: 'Pendarasan Mazmur' },
  { positionName: 'Lektor 2' },
  { positionName: 'Pandu Persembahan' },
  { positionName: 'Pengakuan Iman' },
  { positionName: 'Persembahan Barat' },
  { positionName: 'Persembahan Timur' },
  { positionName: 'Persembahan Majelis/Balkon' },
  { positionName: 'Terima Tamu 1' },
  { positionName: 'Terima Tamu 2' },
  { positionName: 'Terima Tamu 3' },
  { positionName: 'Operator LCD' },
  { positionName: 'Organis' },
  { positionName: 'Song Leader' },
  { positionName: 'Balita' },
  { positionName: 'Pratama' },
  { positionName: 'Madya' },
  { positionName: 'Remaja' },
];
for (const pos of pelayanPositions) {
  db.prepare(
    `INSERT OR IGNORE INTO pelayanPosition (positionName) VALUES (?)`
  ).run(pos.positionName);
}

// --- Seed ibadahCategory ---
const ibadahCategories = [
  { categoryName: 'Pagi' },
  { categoryName: 'Sore' },
  { categoryName: 'Sukapura' },
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

const pagiCategory = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Pagi') as { id?: number } | undefined)?.id;
const soreCategory = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Sore') as { id?: number } | undefined)?.id;
const sukapuraCategory = (db.prepare('SELECT id FROM ibadahCategory WHERE categoryName = ?').get('Sukapura') as { id?: number } | undefined)?.id;

const pendeta = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Pendeta') as { id?: number } | undefined)?.id;
const penatua = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Penatua') as { id?: number } | undefined)?.id;
const diaken = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Diaken') as { id?: number } | undefined)?.id;
const panutan = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Panutan') as { id?: number } | undefined)?.id;
const bapak = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Bapak') as { id?: number } | undefined)?.id;
const ibu = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Ibu') as { id?: number } | undefined)?.id;
const saudara = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Saudara') as { id?: number } | undefined)?.id;
const saudari = (db.prepare('SELECT id FROM pelayanLevel WHERE levelName = ?').get('Saudari') as { id?: number } | undefined)?.id;

// --- Seed users based on the Excel data ---
if (mainServiceKRW && sukapuraKRW && pagiCategory && soreCategory && sukapuraCategory && 
    pendeta && penatua && diaken && panutan && bapak && ibu && saudara && saudari) {
  
  const users = [
    // Main Service participants
    { name: 'Pnt Maria Karunia Ningtyas', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pdt. Argo Daniel Satwiko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: pendeta },
    { name: 'Pnt Urip Waluyo', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Harti Endarwati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Budi Krisyanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Sriyono Sundoro Hadi', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Aryo Whisnu Wijaya', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Triana Koeshartatik', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Windra Ardianto K', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Teguh Prihandoko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Kris Endah Yuli Astuti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Emmy Rochmiati H', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Maria Widiastuti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Eunike Agrivina K', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Sri Purwanti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Nur Asih Yupitasari', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Gamma Kristian A', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Ibu Sri winarsih', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: ibu },
    { name: 'Pnt Ice Yuliarto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Ibu Endah', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: ibu },
    { name: 'Pnt Maria Widiastuti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Djumadi', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Eunike Agrivina K', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Budi Krisyanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Gradian Wahyu U', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Nur Asih Yupitasari', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Elisabeth', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Gamma Kristian A', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Conie Dwi Purwiranti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Hadoko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Haris Wahyu D', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Petrus Yuli Iswanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Teguh Prihandoko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Gradian Wahyu U', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Debora Glestin Rosana', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Conie Dwi Purwiranti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Hadoko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Neunike Agrivina', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Dewi Sukmawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Harti Endarwati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Pujianto Hari Wibowo', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Sam Probo Yunanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Haris Wahyu D', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Dewi sukmawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Diah Kristinawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Ice Yuliarto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Rinto Oloan Kesuma S', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Harti Endarwati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Juni Wandi Purba', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Harti Endarwati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Diah Kristinawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Ice Yuliarto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Sriyono Sundoro Hadi', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Sri Purwanti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Dwidjo Sih Sriwigyanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Juni Wandi Purba', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Sriyono Sundoro Hadi', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Kris Endah Yuli Astuti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    
    // Sukapura participants
    { name: 'Pnt Juni Wandi Purba', active: 1, id_krw: sukapuraKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Maria Widiastuti', active: 1, id_krw: sukapuraKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Debora Glestin R.', active: 1, id_krw: sukapuraKRW, id_pelayanLevel: diaken },
    { name: 'Bp.Riski Nugraha M.P', active: 1, id_krw: sukapuraKRW, id_pelayanLevel: bapak },
    { name: 'Ibu Nuri Hutami', active: 1, id_krw: sukapuraKRW, id_pelayanLevel: ibu },
  ];

  for (const user of users) {
    db.prepare(
      `INSERT OR IGNORE INTO users (name, active, id_krw, id_pelayanLevel) VALUES (?, ?, ?, ?)`
    ).run(user.name, user.active, user.id_krw, user.id_pelayanLevel);
  }
}

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

// --- Helper function to determine stola color and dress code based on date and category ---
function getDressCodeAndStola(serviceDate: string, categoryName: string): { stola: string, dressCode: string } {
  const date = new Date(serviceDate);
  const month = date.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Church liturgical calendar logic
  let stola = 'Hijau'; // Default: Ordinary time
  let dressCode = 'Polos'; // Default dress code
  
  // Liturgical seasons (simplified)
  if (month === 12 || month === 1) {
    stola = 'Putih'; // Christmas season
    dressCode = 'Batik';
  } else if (month === 3 || month === 4) {
    stola = 'Ungu'; // Lent season  
    dressCode = 'Polos';
  } else if (month === 5) {
    stola = 'Putih'; // Easter season
    dressCode = 'Batik';
  } else if (month === 6) {
    stola = 'Merah'; // Pentecost
    dressCode = 'Batik';
  } else {
    stola = 'Hijau'; // Ordinary time
    dressCode = categoryName === 'Pagi' ? 'Batik' : 'Polos';
  }
  
  return { stola, dressCode };
}

// --- Seed ibadah with stola and dress_code ---
if (pagiCategory && soreCategory && sukapuraCategory) {
  // Generate dates for the next few Sundays
  const today = new Date();
  const nextSunday = getNextSunday(today);
  
  // Create dates for multiple weeks
  const dates = [
    formatDate(nextSunday),
    formatDate(new Date(nextSunday.getTime() + 7 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(nextSunday.getTime() + 14 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(nextSunday.getTime() + 21 * 24 * 60 * 60 * 1000)),
    formatDate(new Date(nextSunday.getTime() + 28 * 24 * 60 * 60 * 1000)),
  ];

  // Service schedules with stola and dress_code
  const serviceSchedules = [
    // Regular weekly services
    ...dates.map(date => {
      const pagiDressCode = getDressCodeAndStola(date, 'Pagi');
      const soreDressCode = getDressCodeAndStola(date, 'Sore');
      const sukapuraDressCode = getDressCodeAndStola(date, 'Sukapura');
      
      return [
        {
          id_ibadahCategory: pagiCategory,
          service_date: date,
          start_service_time: '07:00',
          end_service_time: '08:30',
          stola: pagiDressCode.stola,
          dress_code: pagiDressCode.dressCode
        },
        {
          id_ibadahCategory: soreCategory,
          service_date: date,
          start_service_time: '16:00',
          end_service_time: '17:30',
          stola: soreDressCode.stola,
          dress_code: soreDressCode.dressCode
        },
        {
          id_ibadahCategory: sukapuraCategory,
          service_date: date,
          start_service_time: '08:00',
          end_service_time: '09:30',
          stola: sukapuraDressCode.stola,
          dress_code: sukapuraDressCode.dressCode
        }
      ];
    }).flat()
  ];

  // Insert ibadah records
  const ibadahStmt = db.prepare(
    `INSERT OR IGNORE INTO ibadah (id_ibadahCategory, service_date, start_service_time, end_service_time, stola, dress_code) 
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  for (const service of serviceSchedules) {
    ibadahStmt.run(
      service.id_ibadahCategory,
      service.service_date,
      service.start_service_time,
      service.end_service_time,
      service.stola,
      service.dress_code
    );
  }

  console.log('✅ Ibadah services seeded with stola and dress_code!');
}

// Get position IDs for assignments (sample assignments)
const positionIds = {
  pelayanFirman: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pelayan Firman') as { id?: number } | undefined)?.id,
  pendamping: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pendamping/Koordinator Ibadah') as { id?: number } | undefined)?.id,
  panduWarta: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Pandu Warta') as { id?: number } | undefined)?.id,
  lektor1: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Lektor 1') as { id?: number } | undefined)?.id,
  lektor2: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Lektor 2') as { id?: number } | undefined)?.id,
  operator: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Operator LCD') as { id?: number } | undefined)?.id,
  organis: (db.prepare('SELECT id FROM pelayanPosition WHERE positionName = ?').get('Organis') as { id?: number } | undefined)?.id,
};

// Sample assignments for the first few services
if (positionIds.pelayanFirman && positionIds.pendamping && positionIds.panduWarta) {
  const assignmentStmt = db.prepare(
    `INSERT OR IGNORE INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition) VALUES (?, ?, ?)`
  );

  // Get some ibadah IDs and user IDs for sample assignments
  const ibadahServices = db.prepare(`SELECT id, id_ibadahCategory, service_date FROM ibadah LIMIT 6`).all() as Array<{id: number, id_ibadahCategory: number, service_date: string}>;
  const sampleUsers = db.prepare(`SELECT id, name FROM users LIMIT 10`).all() as Array<{id: number, name: string}>;

  // Create sample assignments
  ibadahServices.forEach((service, index) => {
    const userIndex = index % sampleUsers.length;
    const positionKeys = Object.keys(positionIds);
    const positionIndex = index % positionKeys.length;
    const positionKey = positionKeys[positionIndex] as keyof typeof positionIds;
    const positionId = positionIds[positionKey];
    
    if (positionId && sampleUsers[userIndex]) {
      assignmentStmt.run(service.id, sampleUsers[userIndex].id, positionId);
    }
  });

  console.log('✅ Sample assignments created!');
}

console.log('✅ Church service seeding with stola and dress_code completed!');

// Verification query
const verifyQuery = db.prepare(`
  SELECT 
    i.service_date,
    i.start_service_time,
    i.end_service_time,
    ic.categoryName as service_category,
    i.stola,
    i.dress_code,
    COUNT(ia.id) as assignments_count
  FROM ibadah i
  JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
  LEFT JOIN ibadah_assignments ia ON i.id = ia.id_ibadah
  GROUP BY i.id, i.service_date, i.start_service_time, i.end_service_time, ic.categoryName, i.stola, i.dress_code
  ORDER BY i.service_date, i.start_service_time;
`);

const results = verifyQuery.all();
console.log('\n📋 Service Schedule with Dress Codes:');
console.table(results);

db.close();