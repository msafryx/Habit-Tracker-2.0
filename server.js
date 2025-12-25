const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { habitQueries, logQueries, noteQueries } = require('./db');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Broadcast to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log(`Client connected from ${req.socket.remoteAddress}`);
  ws.on('close', () => {
    console.log('Client disconnected');
  });
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// API Routes

// Get all habits
app.get('/api/habits', (req, res) => {
  try {
    const habits = habitQueries.getAll.all();
    res.json(habits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create habit
app.post('/api/habits', (req, res) => {
  try {
    const { id, name, icon, category } = req.body;
    console.log('Creating habit:', { id, name, icon, category });
    habitQueries.create.run(id, name, icon || '•', category || 'General');
    const habit = habitQueries.getById.get(id);
    console.log('Habit created successfully:', habit);
    broadcast({ type: 'habit_created', data: habit });
    res.json(habit);
  } catch (error) {
    console.error('Error creating habit:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update habit
app.put('/api/habits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, category } = req.body;
    habitQueries.update.run(name, icon, category, id);
    const habit = habitQueries.getById.get(id);
    broadcast({ type: 'habit_updated', data: habit });
    res.json(habit);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete habit
app.delete('/api/habits/:id', (req, res) => {
  try {
    const { id } = req.params;
    logQueries.deleteByHabit.run(id);
    habitQueries.delete.run(id);
    broadcast({ type: 'habit_deleted', data: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a date range
app.get('/api/logs', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      const logs = logQueries.getByDateRange.all(startDate, endDate);
      res.json(logs);
    } else {
      res.json([]);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a specific date
app.get('/api/logs/:dateKey', (req, res) => {
  try {
    const { dateKey } = req.params;
    const logs = logQueries.getByDate.all(dateKey);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update habit log (check/uncheck)
app.post('/api/logs', (req, res) => {
  try {
    const { dateKey, habitId, completed } = req.body;
    logQueries.upsert.run(dateKey, habitId, completed ? 1 : 0, completed ? 1 : 0);
    broadcast({ type: 'log_updated', data: { dateKey, habitId, completed } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily note
app.get('/api/notes/daily/:dateKey', (req, res) => {
  try {
    const { dateKey } = req.params;
    const result = noteQueries.getDaily.get(dateKey);
    res.json({ note: result ? result.note : '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update daily note
app.post('/api/notes/daily', (req, res) => {
  try {
    const { dateKey, note } = req.body;
    noteQueries.upsertDaily.run(dateKey, note, note);
    broadcast({ type: 'daily_note_updated', data: { dateKey, note } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get global notes
app.get('/api/notes/global', (req, res) => {
  try {
    const result = noteQueries.getGlobal.get();
    res.json({ content: result ? result.content : '' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update global notes
app.post('/api/notes/global', (req, res) => {
  try {
    const { content } = req.body;
    noteQueries.upsertGlobal.run(content);
    broadcast({ type: 'global_note_updated', data: { content } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get full state (for initial load)
app.get('/api/state', async (req, res) => {
  try {
    const habits = habitQueries.getAll.all();
    
    // Get all logs (we'll limit to last year for performance)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const startDate = oneYearAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const logs = logQueries.getByDateRange.all(startDate, endDate);
    
    // Organize logs by date
    const habitLog = {};
    logs.forEach((log) => {
      if (!habitLog[log.date_key]) {
        habitLog[log.date_key] = { habits: {}, note: '' };
      }
      habitLog[log.date_key].habits[log.habit_id] = log.completed === 1;
    });
    
    // Get global notes
    const globalNoteResult = noteQueries.getGlobal.get();
    const notes = globalNoteResult ? globalNoteResult.content : '';
    
    console.log(`State requested: ${habits.length} habits, ${Object.keys(habitLog).length} logged days`);
    
    res.json({
      habits,
      habitLog,
      notes,
      lastSaved: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`🚀 Habit Tracker server running on http://localhost:${PORT}`);
  console.log(`📊 Database initialized`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
});

