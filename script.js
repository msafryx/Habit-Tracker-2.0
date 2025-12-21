const DEFAULT_HABITS = [
  { id: 'water', name: '2L water', icon: '💧', category: 'Health' },
  { id: 'sleep', name: '7h sleep', icon: '💤', category: 'Health' },
  { id: 'deepWork', name: '4h deep work', icon: '💻', category: 'Productivity' },
  { id: 'journaling', name: 'Journaling', icon: '✍️', category: 'Mindset' },
  { id: 'reading', name: '20 min read', icon: '📚', category: 'Growth' },
  { id: 'steps', name: '10k steps', icon: '🚶‍♀️', category: 'Health' },
  { id: 'gym', name: 'Strength training', icon: '🏋️', category: 'Fitness' },
  { id: 'meditation', name: 'Meditation', icon: '🧘‍♂️', category: 'Mindset' },
  { id: 'nutrition', name: 'Nourishing meals', icon: '🥗', category: 'Health' },
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
  habits: DEFAULT_HABITS,
  habitLog: {},
  notes: '',
  lastSaved: null,
};

function formatKey(date) {
  return date.toISOString().split('T')[0];
}

function displayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getCurrentWeekDates(reference = new Date()) {
  const today = new Date(reference);
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
  const monday = new Date(today.setDate(diff));
  monday.setHours(12, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}

function getMonthDates(reference = new Date()) {
  const now = new Date(reference);
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) => {
    const d = new Date(year, month, i + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
}

function saveState() {
  state.lastSaved = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  updateSyncStatus('Synced');
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      state = JSON.parse(saved);
    } else {
      state = { habits: DEFAULT_HABITS, habitLog: {}, notes: '', lastSaved: null };
    }
  } catch (err) {
    console.warn('Falling back to defaults', err);
    state = { habits: DEFAULT_HABITS, habitLog: {}, notes: '', lastSaved: null };
  }

  // ensure all logs have all habits
  Object.keys(state.habitLog).forEach((key) => ensureLogEntry(key));
}

function ensureLogEntry(key) {
  if (!state.habitLog[key]) {
    state.habitLog[key] = { habits: {}, note: '' };
  }
  state.habits.forEach((habit) => {
    if (state.habitLog[key].habits[habit.id] === undefined) {
      state.habitLog[key].habits[habit.id] = false;
    }
  });
  return state.habitLog[key];
}

function calculateDailyProgress(key) {
  const log = ensureLogEntry(key);
  if (!state.habits.length) {
    return { completed: 0, total: 0, percent: 0, perfect: false };
  }
  const total = state.habits.length;
  const completed = state.habits.filter((h) => log.habits[h.id]).length;
  const percent = Math.round((completed / total) * 100);
  return { completed, total, percent, perfect: completed === total };
}

function computeAverage(keys) {
  if (!keys.length) return 0;
  const scores = keys.map((key) => calculateDailyProgress(key).percent);
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
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
  state.habits.forEach((habit) => {
    const item = document.createElement('li');
    item.className = 'habit-item';

    const meta = document.createElement('div');
    meta.className = 'habit-meta';
    meta.innerHTML = `
      <div class="icon">${habit.icon || '•'}</div>
      <div>
        <div class="day-label">${habit.name}</div>
        <p class="caption">${habit.category || 'General'}</p>
      </div>
    `;

    const actions = document.createElement('div');
    actions.className = 'habit-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'ghost';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      const newName = prompt('Update habit name', habit.name) || habit.name;
      const newIcon = prompt('Update icon', habit.icon) || habit.icon;
      const newCat = prompt('Update category', habit.category) || habit.category;
      habit.name = newName.trim();
      habit.icon = newIcon.trim();
      habit.category = newCat.trim();
      saveState();
      refreshUI();
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      const confirmed = confirm(`Delete habit "${habit.name}"? Data for it will be removed.`);
      if (!confirmed) return;
      state.habits = state.habits.filter((h) => h.id !== habit.id);
      Object.values(state.habitLog).forEach((entry) => {
        delete entry.habits[habit.id];
      });
      saveState();
      refreshUI();
    });

    actions.append(editBtn, deleteBtn);
    item.append(meta, actions);
    list.appendChild(item);
  });
  document.getElementById('habit-count').textContent = state.habits.length;
  document.getElementById('habit-total-tag').textContent = `${state.habits.length} habits`;
}

function renderWeekTable() {
  const container = document.getElementById('week-table');
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'row header';
  header.innerHTML = `
    <div class="cell">Date</div>
    <div class="cell">Habits (check to log)</div>
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

    state.habits.forEach((habit) => {
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
      const text = document.createElement('span');
      text.textContent = `${habit.icon || '•'} ${habit.name}`;
      wrapper.appendChild(input);
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
    const avg = computeAverage(keys);
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
  const weekAverage = computeAverage(weekKeys);
  const monthAverage = computeAverage(getMonthDates().map(formatKey));
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

function renderClock() {
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  document.getElementById('current-datetime').textContent = `${now.toLocaleDateString('en-US', options)} · ${time}`;
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
  renderClock();
}

function markTodayPerfect() {
  const todayKey = formatKey(new Date());
  const log = ensureLogEntry(todayKey);
  state.habits.forEach((h) => (log.habits[h.id] = true));
  log.note = log.note || 'Marked as perfect day.';
  saveState();
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

function updateSyncStatus(text) {
  const el = document.getElementById('sync-status');
  el.textContent = text;
}

function attachHandlers() {
  document.getElementById('mark-today').addEventListener('click', markTodayPerfect);
  document.getElementById('save-notes').addEventListener('click', () => {
    state.notes = document.getElementById('notes').value;
    document.getElementById('notes-status').textContent = 'Saved';
    saveState();
    refreshUI();
  });
  document.getElementById('clear-data').addEventListener('click', () => {
    const confirmed = confirm('Clear all habit data? This cannot be undone.');
    if (!confirmed) return;
    state = { habits: DEFAULT_HABITS, habitLog: {}, notes: '', lastSaved: null };
    saveState();
    refreshUI();
  });
  document.getElementById('habit-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('habit-name').value.trim();
    const icon = document.getElementById('habit-icon').value.trim() || '•';
    const category = document.getElementById('habit-category').value.trim() || 'General';
    if (!name) return;
    const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    state.habits.push({ id, name, icon, category });
    Object.keys(state.habitLog).forEach((key) => {
      ensureLogEntry(key).habits[id] = false;
    });
    document.getElementById('habit-name').value = '';
    document.getElementById('habit-icon').value = '';
    document.getElementById('habit-category').value = '';
    saveState();
    refreshUI();
  });

  setInterval(() => {
    renderClock();
  }, 1000 * 30);
}

function init() {
  loadState();
  attachHandlers();
  refreshUI();
  updateSyncStatus('Synced');
}

init();
