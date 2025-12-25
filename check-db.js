const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'habits.db');
const db = new Database(dbPath);

console.log('📊 Habit Tracker Database Contents\n');
console.log('=' .repeat(50));

// Check habits
console.log('\n📝 HABITS:');
console.log('-'.repeat(50));
const habits = db.prepare('SELECT * FROM habits ORDER BY created_at ASC').all();
if (habits.length === 0) {
  console.log('No habits found.');
} else {
  habits.forEach((habit, index) => {
    console.log(`${index + 1}. ${habit.icon} ${habit.name} (${habit.category})`);
    console.log(`   ID: ${habit.id}`);
    console.log(`   Created: ${habit.created_at}`);
    console.log('');
  });
}

// Check habit logs
console.log('\n✅ HABIT LOGS (Last 30 days):');
console.log('-'.repeat(50));
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
const startDate = thirtyDaysAgo.toISOString().split('T')[0];
const endDate = new Date().toISOString().split('T')[0];

const logs = db.prepare(`
  SELECT hl.date_key, hl.habit_id, hl.completed, h.name, h.icon
  FROM habit_logs hl
  JOIN habits h ON hl.habit_id = h.id
  WHERE hl.date_key >= ? AND hl.date_key <= ?
  ORDER BY hl.date_key DESC, h.name ASC
`).all(startDate, endDate);

if (logs.length === 0) {
  console.log('No logs found in the last 30 days.');
} else {
  const logsByDate = {};
  logs.forEach(log => {
    if (!logsByDate[log.date_key]) {
      logsByDate[log.date_key] = [];
    }
    logsByDate[log.date_key].push(log);
  });
  
  Object.keys(logsByDate).sort().reverse().forEach(dateKey => {
    const dateLogs = logsByDate[dateKey];
    const completed = dateLogs.filter(l => l.completed === 1).length;
    const total = dateLogs.length;
    console.log(`\n${dateKey} (${completed}/${total} completed):`);
    dateLogs.forEach(log => {
      const status = log.completed === 1 ? '✅' : '❌';
      console.log(`  ${status} ${log.icon} ${log.name}`);
    });
  });
}

// Check daily notes
console.log('\n📄 DAILY NOTES (Last 10 days with notes):');
console.log('-'.repeat(50));
const notes = db.prepare(`
  SELECT date_key, note, updated_at
  FROM daily_notes
  WHERE note != '' AND note IS NOT NULL
  ORDER BY date_key DESC
  LIMIT 10
`).all();

if (notes.length === 0) {
  console.log('No daily notes found.');
} else {
  notes.forEach(note => {
    console.log(`${note.date_key}: ${note.note.substring(0, 100)}${note.note.length > 100 ? '...' : ''}`);
  });
}

// Check global notes
console.log('\n📝 GLOBAL NOTES:');
console.log('-'.repeat(50));
const globalNote = db.prepare('SELECT content, updated_at FROM global_notes ORDER BY id DESC LIMIT 1').get();
if (!globalNote || !globalNote.content) {
  console.log('No global notes found.');
} else {
  console.log(`Updated: ${globalNote.updated_at}`);
  console.log(`Content: ${globalNote.content.substring(0, 200)}${globalNote.content.length > 200 ? '...' : ''}`);
}

// Statistics
console.log('\n📈 STATISTICS:');
console.log('-'.repeat(50));
const totalHabits = db.prepare('SELECT COUNT(*) as count FROM habits').get();
const totalLogs = db.prepare('SELECT COUNT(*) as count FROM habit_logs WHERE completed = 1').get();
const totalDays = db.prepare('SELECT COUNT(DISTINCT date_key) as count FROM habit_logs').get();

console.log(`Total Habits: ${totalHabits.count}`);
console.log(`Total Completed Logs: ${totalLogs.count}`);
console.log(`Days with Logs: ${totalDays.count}`);

db.close();
console.log('\n' + '='.repeat(50));
console.log('✅ Database check complete!');

