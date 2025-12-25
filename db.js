const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'habits.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Initialize database schema
function initDatabase() {
  // Habits table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '•',
      category TEXT DEFAULT 'General',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Habit logs table (stores daily completions)
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_key TEXT NOT NULL,
      habit_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE,
      UNIQUE(date_key, habit_id)
    )
  `);

  // Daily notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_notes (
      date_key TEXT PRIMARY KEY,
      note TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Global notes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS global_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(date_key);
    CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
  `);
}

// Initialize database FIRST before preparing queries
initDatabase();

// Habit operations
const habitQueries = {
  getAll: db.prepare('SELECT * FROM habits ORDER BY created_at ASC'),
  getById: db.prepare('SELECT * FROM habits WHERE id = ?'),
  create: db.prepare(`
    INSERT INTO habits (id, name, icon, category)
    VALUES (?, ?, ?, ?)
  `),
  update: db.prepare(`
    UPDATE habits 
    SET name = ?, icon = ?, category = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),
  delete: db.prepare('DELETE FROM habits WHERE id = ?'),
};

// Habit log operations
const logQueries = {
  getByDate: db.prepare(`
    SELECT hl.habit_id, hl.completed, h.name, h.icon, h.category
    FROM habit_logs hl
    JOIN habits h ON hl.habit_id = h.id
    WHERE hl.date_key = ?
    ORDER BY h.created_at ASC
  `),
  getByDateRange: db.prepare(`
    SELECT hl.date_key, hl.habit_id, hl.completed
    FROM habit_logs hl
    WHERE hl.date_key >= ? AND hl.date_key <= ?
  `),
  upsert: db.prepare(`
    INSERT INTO habit_logs (date_key, habit_id, completed)
    VALUES (?, ?, ?)
    ON CONFLICT(date_key, habit_id) DO UPDATE SET completed = ?
  `),
  deleteByHabit: db.prepare('DELETE FROM habit_logs WHERE habit_id = ?'),
};

// Notes operations
const noteQueries = {
  getDaily: db.prepare('SELECT note FROM daily_notes WHERE date_key = ?'),
  upsertDaily: db.prepare(`
    INSERT INTO daily_notes (date_key, note, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(date_key) DO UPDATE SET note = ?, updated_at = CURRENT_TIMESTAMP
  `),
  getGlobal: db.prepare('SELECT content FROM global_notes ORDER BY id DESC LIMIT 1'),
  upsertGlobal: db.prepare(`
    INSERT INTO global_notes (content, updated_at)
    VALUES (?, CURRENT_TIMESTAMP)
  `),
};

module.exports = {
  db,
  habitQueries,
  logQueries,
  noteQueries,
};

