const habits = [
  { id: 'water', name: '2L water', icon: '💧', category: 'Health' },
  { id: 'sleep', name: '7h sleep', icon: '💤', category: 'Health' },
  { id: 'deepWork', name: '4h deep work', icon: '💻', category: 'Productivity' },
  { id: 'journaling', name: 'Journaling', icon: '✍️', category: 'Mindset' },
  { id: 'reading', name: '20 min read', icon: '📚', category: 'Growth' },
  { id: 'steps', name: '10k steps', icon: '🚶‍♀️', category: 'Health' },
  { id: 'gym', name: 'Gym/Strength', icon: '🏋️', category: 'Fitness' },
  { id: 'meditation', name: 'Meditation', icon: '🧘‍♂️', category: 'Mindset' },
  { id: 'nutrition', name: 'No junk food', icon: '🥗', category: 'Health' },
  { id: 'social', name: 'Intentional reach-out', icon: '🤝', category: 'Relationships' },
];

const milestoneTargets = [
  { label: 'First Streak', days: 5, reward: 'Amazing start! Keep building momentum.' },
  { label: 'Consistency Master', days: 15, reward: '15 days of consistency – keep it rolling.' },
  { label: 'Habit Warrior', days: 30, reward: "30 perfect days logged. You're on fire." },
  { label: 'Discipline Champion', days: 50, reward: "50-day streak says you're unshakable." },
  { label: 'Transformation Complete', days: 75, reward: '75 days of excellence. Nearly there.' },
  { label: 'Century Club', days: 100, reward: '100 perfect days! A new standard set.' },
];

const STORAGE_KEY = 'habit-tracker-2.0';

let state = {
  habitLog: {},
  notes: '',
};

function formatKey(date) {
  return date.toISOString().split('T')[0];
}

function displayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCurrentWeekDates() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(today.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}

function getMonthDates() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const d = new Date(year, month, i + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}

function ensureLogEntry(key) {
  if (!state.habitLog[key]) {
    const defaults = {};
    habits.forEach((h) => (defaults[h.id] = false));
    state.habitLog[key] = { habits: defaults, note: '' };
  }
  return state.habitLog[key];
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = JSON.parse(saved);
      return;
    }
  } catch (err) {
    console.warn('No saved data, using demo seed.', err);
  }
  seedDemoState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seedDemoState() {
  state = { habitLog: {}, notes: 'Focus on closing all rings on Wednesday and Sunday this week.' };
  const monthDates = getMonthDates();
  const sampleWeights = [0.2, 0.35, 0.5, 0.65, 0.75, 0.9, 1];

  monthDates.forEach((date, idx) => {
    const key = formatKey(date);
    const log = ensureLogEntry(key);
    const target = sampleWeights[idx % sampleWeights.length];
    habits.forEach((h, hIdx) => {
      const completionChance = target - (hIdx % 3) * 0.08;
      log.habits[h.id] = Math.random() < Math.max(0, completionChance);
    });
    if (idx % 5 === 0) {
      log.note = 'Energy high; leaned into deep work and gym.';
    }
    if (idx % 6 === 0) {
      log.note = 'Travel day, kept it light.';
    }
    state.habitLog[key] = log;
  });
  saveState();
}

function calculateDailyProgress(key) {
  const log = ensureLogEntry(key);
  const total = habits.length;
  const completed = habits.filter((h) => log.habits[h.id]).length;
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent, perfect: completed === total };
}

function computeWeekAverage(weekKeys) {
  const scores = weekKeys.map((key) => calculateDailyProgress(key).percent);
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return Math.round(average);
}

function computeMonthAverage() {
  const monthKeys = getMonthDates().map(formatKey);
  const scores = monthKeys.map((key) => calculateDailyProgress(key).percent);
  const average = scores.reduce((a, b) => a + b, 0) / monthKeys.length;
  return Math.round(average);
}

function currentPerfectStreak() {
  const monthKeys = getMonthDates().map(formatKey);
  const todayKey = formatKey(new Date());
  let streak = 0;
  for (let i = monthKeys.length - 1; i >= 0; i -= 1) {
    const key = monthKeys[i];
    if (new Date(key) > new Date(todayKey)) continue;
    const { perfect } = calculateDailyProgress(key);
    if (perfect) {
      streak += 1;
    } else if (key === todayKey || streak > 0) {
      break;
    }
  }
  return streak;
}

function longestPerfectStreak() {
  const keys = getMonthDates().map(formatKey);
  let longest = 0;
  let current = 0;
  keys.forEach((key) => {
    const { perfect } = calculateDailyProgress(key);
    if (perfect) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });
  return longest;
}

function renderHabitList() {
  const list = document.getElementById('habit-list');
  list.innerHTML = '';
  habits.forEach((habit) => {
    const item = document.createElement('li');
    item.className = 'habit-item';

    item.innerHTML = `
      <div class="habit-meta">
        <div class="icon">${habit.icon}</div>
        <div>
          <div class="day-label">${habit.name}</div>
          <p class="caption">${habit.category}</p>
        </div>
      </div>
      <span class="tag neutral">Track</span>
    `;
    list.appendChild(item);
  });
  document.getElementById('habit-count').textContent = habits.length;
}

function renderWeekTable() {
  const container = document.getElementById('week-table');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'row header';
  header.innerHTML = `
    <div class="cell">Date</div>
    <div class="cell">Habits (tap to log)</div>
    <div class="cell">Daily status</div>
    <div class="cell">Notes</div>
  `;
  container.appendChild(header);

  const weekDates = getCurrentWeekDates();
  weekDates.forEach((date) => {
    const key = formatKey(date);
    const row = document.createElement('div');
    row.className = 'row';

    const progress = calculateDailyProgress(key);

    const dateCell = document.createElement('div');
    dateCell.className = 'cell progress';
    dateCell.innerHTML = `
      <div class="day-label">${displayLabel(date)}</div>
      <div class="caption">${progress.completed}/${progress.total} habits</div>
      <div class="progress-shell" style="margin-top: 6px;">
        <div class="progress-bar" style="width:${progress.percent}%;"></div>
      </div>
    `;

    const habitsCell = document.createElement('div');
    habitsCell.className = 'cell habits';
    const checks = document.createElement('div');
    checks.className = 'habit-checkboxes';

    habits.forEach((habit) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'habit-check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = ensureLogEntry(key).habits[habit.id];
      input.addEventListener('change', () => {
        ensureLogEntry(key).habits[habit.id] = input.checked;
        saveState();
        refreshUI();
      });
      wrapper.appendChild(input);
      const text = document.createElement('span');
      text.textContent = `${habit.icon} ${habit.name}`;
      wrapper.appendChild(text);
      checks.appendChild(wrapper);
    });
    habitsCell.appendChild(checks);

    const statusCell = document.createElement('div');
    statusCell.className = 'cell';
    const status = document.createElement('div');
    status.className = 'daily-status';

    if (progress.perfect) {
      status.classList.add('perfect');
      status.textContent = 'Perfect day';
    } else if (progress.percent >= 70) {
      status.classList.add('good');
      status.textContent = 'On track';
    } else {
      status.textContent = 'Keep going';
    }
    statusCell.appendChild(status);

    const noteCell = document.createElement('div');
    noteCell.className = 'cell';
    const note = document.createElement('input');
    note.type = 'text';
    note.className = 'note-input';
    note.placeholder = 'Start logging';
    note.value = ensureLogEntry(key).note || '';
    note.addEventListener('input', (e) => {
      ensureLogEntry(key).note = e.target.value;
      saveState();
    });
    noteCell.appendChild(note);

    row.append(dateCell, habitsCell, statusCell, noteCell);
    container.appendChild(row);
  });
}

function renderWeeklyChart() {
  const container = document.getElementById('weekly-chart');
  container.innerHTML = '';
  const weekDates = getCurrentWeekDates();

  weekDates.forEach((date) => {
    const key = formatKey(date);
    const { percent, perfect } = calculateDailyProgress(key);
    const card = document.createElement('div');
    card.className = 'progress-card';
    card.innerHTML = `
      <header>
        <span>${displayLabel(date)}</span>
        <span>${percent}%</span>
      </header>
      <div class="bar-shell"><div class="bar" style="width:${percent}%;"></div></div>
      <p class="caption" style="margin-top: 6px;">${perfect ? 'Perfect day' : 'Daily completion'}</p>
    `;
    container.appendChild(card);
  });
}

function renderMonthGrid() {
  const grid = document.getElementById('month-grid');
  grid.innerHTML = '';
  const dates = getMonthDates();
  dates.forEach((date) => {
    const key = formatKey(date);
    const progress = calculateDailyProgress(key);
    const card = document.createElement('div');
    card.className = 'day-card';
    card.innerHTML = `
      <div class="date">${date.getDate()}</div>
      <div class="caption">${progress.completed}/${progress.total} habits</div>
      <div class="progress-shell" style="margin-top: 6px;"><div class="progress-bar" style="width:${progress.percent}%"></div></div>
      <div class="caption" style="margin-top: 6px;">${progress.percent}% complete</div>
    `;
    grid.appendChild(card);
  });
}

function renderWeekRollup() {
  const weeks = document.getElementById('week-rollup');
  weeks.innerHTML = '';
  const dates = getMonthDates();
  for (let i = 0; i < dates.length; i += 7) {
    const chunk = dates.slice(i, i + 7);
    const keys = chunk.map(formatKey);
    const avg = computeWeekAverage(keys);
    const roll = document.createElement('div');
    roll.className = 'rollup-card';
    const rangeLabel = `${chunk[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${chunk[chunk.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    roll.innerHTML = `
      <header style="display:flex; justify-content: space-between; margin-bottom: 6px; font-weight:700;">
        <span>Week ${Math.floor(i / 7) + 1}</span>
        <span>${avg}%</span>
      </header>
      <p class="caption">${rangeLabel}</p>
      <div class="progress-shell" style="margin-top: 8px;"><div class="progress-bar" style="width:${avg}%"></div></div>
    `;
    weeks.appendChild(roll);
  }
}

function renderMilestones() {
  const container = document.getElementById('milestones');
  container.innerHTML = '';
  const streak = currentPerfectStreak();
  const longest = longestPerfectStreak();

  milestoneTargets.forEach((m) => {
    const card = document.createElement('div');
    card.className = 'milestone-card';
    let statusClass = 'locked';
    let statusLabel = 'Locked';
    if (streak >= m.days) {
      statusClass = 'done';
      statusLabel = 'Unlocked';
    } else if (longest >= m.days / 2) {
      statusClass = 'active';
      statusLabel = 'In progress';
    }
    const progress = Math.min(100, Math.round((streak / m.days) * 100));
    card.innerHTML = `
      <header>
        <span>${m.label}</span>
        <span class="status-pill ${statusClass}">${statusLabel}</span>
      </header>
      <p class="caption">${m.reward}</p>
      <div class="progress-shell" style="margin-top: 8px;"><div class="progress-bar" style="width:${progress}%"></div></div>
      <p class="caption" style="margin-top: 6px;">${streak}/${m.days} perfect days</p>
    `;
    container.appendChild(card);
  });
  document.getElementById('current-streak').textContent = `${streak} days`;
}

function renderStats() {
  const weekKeys = getCurrentWeekDates().map(formatKey);
  const weekAverage = computeWeekAverage(weekKeys);
  const monthAverage = computeMonthAverage();
  document.getElementById('week-progress').textContent = `${weekAverage}%`;
  document.getElementById('month-progress').textContent = `${monthAverage}%`;
  document.getElementById('week-progress-bar').style.width = `${weekAverage}%`;
  document.getElementById('month-progress-bar').style.width = `${monthAverage}%`;
}

function renderNotes() {
  const notes = document.getElementById('notes');
  notes.value = state.notes || '';
  document.getElementById('notes-status').textContent = state.notes ? 'Saved' : 'Unsaved';
}

function refreshUI() {
  renderHabitList();
  renderWeekTable();
  renderWeeklyChart();
  renderMonthGrid();
  renderWeekRollup();
  renderMilestones();
  renderStats();
  renderNotes();
  saveState();
}

function markTodayPerfect() {
  const todayKey = formatKey(new Date());
  const log = ensureLogEntry(todayKey);
  habits.forEach((h) => (log.habits[h.id] = true));
  log.note = log.note || 'Marked as perfect day.';
  refreshUI();
}

function logNextHabit() {
  const todayKey = formatKey(new Date());
  const log = ensureLogEntry(todayKey);
  const next = habits.find((h) => !log.habits[h.id]);
  if (next) {
    log.habits[next.id] = true;
  } else {
    habits.forEach((h) => (log.habits[h.id] = false));
  }
  refreshUI();
}

function focusTodayNote() {
  const weekRows = Array.from(document.querySelectorAll('.row'));
  const targetRow = weekRows.find((row) => row.textContent.includes(displayLabel(new Date())));
  if (targetRow) {
    const input = targetRow.querySelector('input.note-input');
    if (input) {
      input.focus();
    }
  }
}

function attachHandlers() {
  document.getElementById('mark-today').addEventListener('click', markTodayPerfect);
  document.getElementById('log-habits').addEventListener('click', logNextHabit);
  document.getElementById('add-note').addEventListener('click', focusTodayNote);
  document.getElementById('save-notes').addEventListener('click', () => {
    state.notes = document.getElementById('notes').value;
    document.getElementById('notes-status').textContent = 'Saved';
    refreshUI();
  });
  document.getElementById('reset-data').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    seedDemoState();
    refreshUI();
  });
}

loadState();
attachHandlers();
refreshUI();
