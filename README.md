# Habit Tracker 2.0 - Real-Time & Responsive

A professional, real-time habit tracking application with database persistence, WebSocket support, and full responsive design. Track your habits across days, weeks, months, and years with live updates and beautiful visualizations.

## ✨ Features

- **Real-time tracking:** Live updates via WebSocket, instant sync across all devices
- **Database persistence:** SQLite database stores all your data securely
- **Fully responsive:** Works beautifully on mobile, tablet, and desktop
- **Daily logging:** Check off habits for each day and add inline notes
- **Weekly chart & rollups:** Visual progress for the current week plus averages
- **Monthly overview:** Daily completion bars across the current month
- **Annual overview:** Month-by-month cards with click-through daily detail
- **Streak milestones:** Automatic badges for perfect-day streaks (5–100 days)
- **Habit CRUD:** Add new habits, edit names/icons/categories inline, or delete ones you don't need
- **Real-time sync:** All changes sync instantly across all connected clients
- **Offline support:** Graceful fallback when server is unavailable

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to `http://localhost:3000`

The database will be automatically created on first run.

## 📱 Usage

1. **Add habits:** Use the "Create / edit / delete" panel to add your habits
2. **Log daily progress:** Check boxes in the "Week overview" table to log completions
3. **View statistics:** See your current streak, week/month completion rates, and more
4. **Track long-term:** Use the annual overview to see your progress across months
5. **Add notes:** Capture insights, wins, or ideas in the notes section

## 🏗️ Architecture

- **Backend:** Node.js + Express + SQLite
- **Real-time:** WebSocket (ws) for live updates
- **Frontend:** Vanilla JavaScript (no framework dependencies)
- **Database:** SQLite with WAL mode for better concurrency

## 📊 Database Schema

- `habits`: Stores habit definitions (id, name, icon, category)
- `habit_logs`: Stores daily completions (date_key, habit_id, completed)
- `daily_notes`: Stores notes for specific dates
- `global_notes`: Stores general notes/reflections

## 🔧 Configuration

The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## 📦 Project Structure

```
Habit-Tracker-2.0/
├── server.js          # Express server with WebSocket
├── db.js              # Database setup and queries
├── index.html         # Main HTML file
├── script.js          # Frontend JavaScript
├── styles.css         # Responsive styles
├── package.json       # Dependencies
└── habits.db          # SQLite database (created automatically)
```

## 🌐 API Endpoints

- `GET /api/state` - Get full application state
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create a habit
- `PUT /api/habits/:id` - Update a habit
- `DELETE /api/habits/:id` - Delete a habit
- `GET /api/logs/:dateKey` - Get logs for a date
- `POST /api/logs` - Update habit log
- `GET /api/notes/global` - Get global notes
- `POST /api/notes/global` - Update global notes
- `GET /api/notes/daily/:dateKey` - Get daily note
- `POST /api/notes/daily` - Update daily note

## 🔌 WebSocket Events

The server broadcasts the following events:
- `habit_created` - New habit added
- `habit_updated` - Habit modified
- `habit_deleted` - Habit removed
- `log_updated` - Habit completion changed
- `daily_note_updated` - Daily note changed
- `global_note_updated` - Global note changed

## 🎨 Responsive Breakpoints

- **Desktop:** > 1024px (full layout)
- **Tablet:** 768px - 1024px (stacked layout)
- **Mobile:** < 768px (optimized for touch)
- **Small mobile:** < 480px (compact layout)

## 🔒 Data Persistence

All data is stored in a SQLite database (`habits.db`). The database file is created automatically and persists all your habits, logs, and notes. You can backup the database file to preserve your data.

## 🚀 Deployment

### Local Development
Just run `npm start` and access `http://localhost:3000`

### Production Deployment
1. Set `NODE_ENV=production`
2. Use a process manager like PM2: `pm2 start server.js`
3. Set up a reverse proxy (nginx) if needed
4. Consider migrating to PostgreSQL for production use

## 📝 License

MIT

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ for tracking your progress and building better habits.**
