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
    { name: 'Pnt Djumadi', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Gradian Wahyu U', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Elisabeth', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Conie Dwi Purwiranti', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Hadoko', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Haris Wahyu D', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Petrus Yuli Iswanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Dkn Debora Glestin Rosana', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Neunike Agrivina', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Dewi Sukmawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Pujianto Hari Wibowo', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Sam Probo Yunanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Dkn Diah Kristinawati', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: diaken },
    { name: 'Pnt Rinto Oloan Kesuma S', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Juni Wandi Purba', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    { name: 'Pnt Dwidjo Sih Sriwigyanto', active: 1, id_krw: mainServiceKRW, id_pelayanLevel: panutan },
    
    // Sukapura participants
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
  const dayOfWeek = date.getDay();
  if (dayOfWeek === 0) {
    // Already Sunday, get next Sunday
    nextSunday.setDate(date.getDate() + 7);
  } else {
    nextSunday.setDate(date.getDate() + (7 - dayOfWeek));
  }
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

// --- Generate all Sundays for the next 3 months ---
// --- Generate all Sundays from October to December (this year) ---
function generateSundaysForMonths(): string[] {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 9, 1); // October = month index 9
  const endDate = new Date(year, 11, 31); // December 31
  const sundays: string[] = [];

  // Find first Sunday in October
  const current = new Date(startDate);
  while (current.getDay() !== 0) {
    current.setDate(current.getDate() + 1);
  }

  // Collect all Sundays until December 31
  while (current <= endDate) {
    sundays.push(formatDate(current));
    current.setDate(current.getDate() + 7); // Next Sunday
  }

  return sundays;
}



// --- Seed ibadah with stola and dress_code for 3 months ---
if (pagiCategory && soreCategory && sukapuraCategory) {
  const dates = generateSundaysForMonths();
  
  console.log(`📅 Generating services for ${dates.length} Sundays (next 3 months)`);

  // Service schedules with stola and dress_code
  const serviceSchedules = dates.map(date => {
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
  }).flat();

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

  console.log(`✅ ${serviceSchedules.length} Ibadah services seeded with stola and dress_code!`);
}

// Get all position IDs for comprehensive assignments
const allPositions = db.prepare('SELECT id, positionName FROM pelayanPosition').all() as Array<{id: number, positionName: string}>;
const allUsers = db.prepare('SELECT id, name, id_krw FROM users').all() as Array<{id: number, name: string, id_krw: number}>;

// --- Seed comprehensive assignments for all services ---
if (allPositions.length > 0 && allUsers.length > 0) {
  const allIbadahServices = db.prepare(`
    SELECT i.id, i.id_ibadahCategory, i.service_date, ic.categoryName
    FROM ibadah i
    JOIN ibadahCategory ic ON i.id_ibadahCategory = ic.id
    ORDER BY i.service_date ASC
  `).all() as Array<{id: number, id_ibadahCategory: number, service_date: string, categoryName: string}>;

  console.log(`📋 Creating assignments for ${allIbadahServices.length} services...`);

  // Filter users by KRW
  const mainServiceUsers = allUsers.filter(u => u.id_krw === mainServiceKRW);
  const sukapuraUsers = allUsers.filter(u => u.id_krw === sukapuraKRW);

  const checkUserAlreadyAssigned = (id_ibadah: number, id_users: number) => {
    const existing = db.prepare(`
      SELECT id FROM ibadah_assignments WHERE id_ibadah = ? AND id_users = ?
    `).get(id_ibadah, id_users);
    return !!existing;
  };

  const checkPositionConflict = (id_ibadah: number, id_pelayanPosition: number) => {
    const existing = db.prepare(`
      SELECT id FROM ibadah_assignments WHERE id_ibadah = ? AND id_pelayanPosition = ?
    `).get(id_ibadah, id_pelayanPosition);
    return !!existing;
  };

  const insertAssignment = db.prepare(`
    INSERT INTO ibadah_assignments (id_ibadah, id_users, id_pelayanPosition)
    VALUES (?, ?, ?)
  `);

  let assignmentCount = 0;

  for (const service of allIbadahServices) {
    const eligibleUsers = service.categoryName === 'Sukapura' ? sukapuraUsers : mainServiceUsers;

    allPositions.forEach((position, positionIndex) => {
      const userOffset = positionIndex % eligibleUsers.length;
      const assignedUser = eligibleUsers[userOffset];
      if (!assignedUser) return;

      // Validation logic (matches POST route)
      if (checkUserAlreadyAssigned(service.id, assignedUser.id)) {
        console.log(`⚠️ User ${assignedUser.name} already assigned for service ${service.id}, skipping.`);
        return;
      }
      if (checkPositionConflict(service.id, position.id)) {
        console.log(`⚠️ Position ${position.positionName} already filled for service ${service.id}, skipping.`);
        return;
      }

      try {
        insertAssignment.run(service.id, assignedUser.id, position.id);
        assignmentCount++;
      } catch (err) {
        console.log(`⚠️ Error inserting assignment for service ${service.id}:`, err);
      }
    });
  }

  console.log(`✅ ${assignmentCount} valid assignments created!`);
}


console.log('✅ Church service seeding with 3 months data completed!');

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
console.log('\n📋 Service Schedule Summary (first 10):');
console.table(results.slice(0, 10));

// Summary statistics
const stats = db.prepare(`
  SELECT 
    COUNT(DISTINCT i.id) as total_services,
    COUNT(DISTINCT ia.id) as total_assignments,
    COUNT(DISTINCT u.id) as total_users_assigned,
    MIN(i.service_date) as first_service,
    MAX(i.service_date) as last_service
  FROM ibadah i
  LEFT JOIN ibadah_assignments ia ON i.id = ia.id_ibadah
  LEFT JOIN users u ON ia.id_users = u.id
`).get();

console.log('\n📊 Overall Statistics:');
console.table([stats]);

db.close();