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

// API Configuration
const API_BASE = window.location.origin;
// Determine WebSocket URL - use same origin if available, otherwise default to port 3000
const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  // If served from same server, use same port; otherwise default to 3000
  if (window.location.port) {
    return `${protocol}//${host}:${window.location.port}`;
  }
  // Default to port 3000 for development
  return `${protocol}//${host}:3000`;
};
const WS_URL = getWebSocketUrl();

let state = {
  habits: [],
  habitLog: {},
  notes: '',
  lastSaved: null,
};
let editingHabitId = null;
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// WebSocket connection
function connectWebSocket() {
  try {
    console.log('Attempting WebSocket connection to:', WS_URL);
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      reconnectAttempts = 0;
      updateSyncStatus('Connected');
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);
        handleRealtimeUpdate(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      updateSyncStatus('Connection error');
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
      updateSyncStatus('Disconnected');
      // Attempt to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(connectWebSocket, 2000 * reconnectAttempts);
      } else {
        console.log('Max reconnection attempts reached');
      }
    };
  } catch (error) {
    console.error('Failed to connect WebSocket:', error);
    updateSyncStatus('Offline mode');
  }
}

// Handle real-time updates from WebSocket
function handleRealtimeUpdate(message) {
  switch (message.type) {
    case 'habit_created':
    case 'habit_updated':
      const habit = message.data;
      const existingIndex = state.habits.findIndex(h => h.id === habit.id);
      if (existingIndex >= 0) {
        state.habits[existingIndex] = habit;
      } else {
        state.habits.push(habit);
      }
      refreshUI();
      break;
    case 'habit_deleted':
      state.habits = state.habits.filter(h => h.id !== message.data.id);
      refreshUI();
      break;
    case 'log_updated':
      const { dateKey, habitId, completed } = message.data;
      if (!state.habitLog[dateKey]) {
        state.habitLog[dateKey] = { habits: {}, note: '' };
      }
      state.habitLog[dateKey].habits[habitId] = completed;
      refreshUI();
      break;
    case 'daily_note_updated':
      const { dateKey: noteDateKey, note } = message.data;
      if (!state.habitLog[noteDateKey]) {
        state.habitLog[noteDateKey] = { habits: {}, note: '' };
      }
      state.habitLog[noteDateKey].note = note;
      refreshUI();
      break;
    case 'global_note_updated':
      state.notes = message.data.content;
      renderNotes();
      break;
  }
}

// API functions
async function apiRequest(endpoint, options = {}) {
  try {
    const url = `${API_BASE}${endpoint}`;
    console.log('API Request:', options.method || 'GET', url);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', response.status, errorText);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    console.log('API Success:', url, data);
    return data;
  } catch (error) {
    console.error('API request failed:', endpoint, error);
    updateSyncStatus('Sync error');
    throw error;
  }
}

async function loadState() {
  try {
    console.log('Loading state from API...');
    const data = await apiRequest('/api/state');
    console.log('Loaded state:', data);
    state.habits = data.habits || [];
    state.habitLog = data.habitLog || {};
    state.notes = data.notes || '';
    state.lastSaved = data.lastSaved || null;
    
    // Ensure all logs have all habits
    Object.keys(state.habitLog).forEach((key) => ensureLogEntry(key));
    
    console.log('State loaded successfully. Habits:', state.habits.length);
    updateSyncStatus('Synced');
  } catch (error) {
    console.error('Failed to load state:', error);
    // Fallback to default state
    state.habits = [];
    state.habitLog = {};
    state.notes = '';
    updateSyncStatus('Offline');
    alert('Failed to connect to server. Please make sure the server is running on port 3000.');
  }
}

async function saveHabit(habit) {
  try {
    if (editingHabitId) {
      await apiRequest(`/api/habits/${habit.id}`, {
        method: 'PUT',
        body: JSON.stringify(habit),
      });
    } else {
      await apiRequest('/api/habits', {
        method: 'POST',
        body: JSON.stringify(habit),
      });
    }
    updateSyncStatus('Synced');
  } catch (error) {
    updateSyncStatus('Sync error');
    throw error;
  }
}

async function deleteHabit(habitId) {
  try {
    await apiRequest(`/api/habits/${habitId}`, {
      method: 'DELETE',
    });
    updateSyncStatus('Synced');
  } catch (error) {
    updateSyncStatus('Sync error');
    throw error;
  }
}

async function updateHabitLog(dateKey, habitId, completed) {
  try {
    await apiRequest('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ dateKey, habitId, completed }),
    });
    updateSyncStatus('Synced');
  } catch (error) {
    updateSyncStatus('Sync error');
    throw error;
  }
}

async function updateDailyNote(dateKey, note) {
  try {
    await apiRequest('/api/notes/daily', {
      method: 'POST',
      body: JSON.stringify({ dateKey, note }),
    });
    updateSyncStatus('Synced');
  } catch (error) {
    updateSyncStatus('Sync error');
    throw error;
  }
}

async function updateGlobalNotes(content) {
  try {
    await apiRequest('/api/notes/global', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
    updateSyncStatus('Synced');
  } catch (error) {
    updateSyncStatus('Sync error');
    throw error;
  }
}

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

function computeMonthAverageFor(monthIndex) {
  const now = new Date();
  const year = now.getFullYear();
  const dates = Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, i) => {
    const d = new Date(year, monthIndex, i + 1);
    d.setHours(12, 0, 0, 0);
    return d;
  });
  const keys = dates.map(formatKey);
  return computeAverage(keys);
}

function monthName(idx) {
  return new Date(2000, idx, 1).toLocaleString('en-US', { month: 'long' });
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
    editBtn.addEventListener('click', () => startEditHabit(habit));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async () => {
      const confirmed = confirm(`Delete habit "${habit.name}"? Data for it will be removed.`);
      if (!confirmed) return;
      try {
        await deleteHabit(habit.id);
        refreshUI();
      } catch (error) {
        alert('Failed to delete habit. Please try again.');
      }
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
      input.addEventListener('change', async () => {
        const completed = input.checked;
        ensureLogEntry(key).habits[habit.id] = completed;
        try {
          await updateHabitLog(key, habit.id, completed);
          refreshUI();
        } catch (error) {
          input.checked = !completed; // Revert on error
          alert('Failed to update. Please try again.');
        }
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
    let noteTimeout;
    note.addEventListener('input', (e) => {
      const noteValue = e.target.value;
      ensureLogEntry(key).note = noteValue;
      clearTimeout(noteTimeout);
      noteTimeout = setTimeout(async () => {
        try {
          await updateDailyNote(key, noteValue);
        } catch (error) {
          console.error('Failed to save note:', error);
        }
      }, 500); // Debounce
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

function renderAnnualGrid() {
  const grid = document.getElementById('annual-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < 12; i += 1) {
    const percent = computeMonthAverageFor(i);
    const card = document.createElement('div');
    card.className = 'annual-card';
    card.dataset.month = i;
    card.innerHTML = `
      <div class="month-name">${monthName(i)}</div>
      <div class="caption">${percent}% complete</div>
      <div class="mini-bar"><div class="mini-fill" style="width:${percent}%"></div></div>
    `;
    card.addEventListener('click', () => openMonthModal(i));
    grid.appendChild(card);
  }
}

function openMonthModal(monthIndex) {
  const backdrop = document.getElementById('month-modal');
  const label = document.getElementById('modal-month-label');
  const summary = document.getElementById('modal-month-summary');
  const list = document.getElementById('modal-days');
  if (!backdrop || !label || !summary || !list) return;

  const safeIndex = Number.isInteger(monthIndex) ? Math.max(0, Math.min(11, monthIndex)) : new Date().getMonth();
  const percent = computeMonthAverageFor(safeIndex);
  label.textContent = monthName(safeIndex);
  summary.textContent = `${percent}% average completion`;
  list.innerHTML = '';

  const now = new Date();
  const year = now.getFullYear();
  const lastDay = new Date(year, safeIndex + 1, 0).getDate();

  if (!state.habits.length) {
    const message = document.createElement('p');
    message.className = 'caption';
    message.textContent = 'Add habits first to see daily progress.';
    list.appendChild(message);
  } else {
    for (let day = 1; day <= lastDay; day += 1) {
      const d = new Date(year, safeIndex, day);
      d.setHours(12, 0, 0, 0);
      const key = formatKey(d);
      const progress = calculateDailyProgress(key);
      const item = document.createElement('div');
      item.className = 'modal-day';
      item.innerHTML = `
        <div class="date">${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
        <div class="caption">${progress.completed}/${progress.total || state.habits.length} habits</div>
        <div class="progress-shell" style="margin-top:6px;"><div class="progress-bar" style="width:${progress.percent}%"></div></div>
        <div class="caption" style="margin-top:6px;">${progress.percent}% complete</div>
      `;
      list.appendChild(item);
    }
  }

  backdrop.hidden = false;
  backdrop.style.display = 'grid';
  console.log('Modal opened for month:', monthName(safeIndex));
}

function closeMonthModal() {
  const backdrop = document.getElementById('month-modal');
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.style.display = 'none';
    console.log('Modal closed');
  }
}

function openNotesModal() {
  const modal = document.getElementById('notes-modal');
  const editor = document.getElementById('notes-editor');
  if (modal && editor) {
    editor.value = state.notes || '';
    document.getElementById('notes-editor-status').textContent = 'Ready to edit';
    modal.hidden = false;
    modal.style.display = 'grid';
    // Focus the editor
    setTimeout(() => editor.focus(), 100);
    console.log('Notes modal opened');
  }
}

function closeNotesModal() {
  const modal = document.getElementById('notes-modal');
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
    console.log('Notes modal closed');
  }
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
  renderAnnualGrid();
  renderWeekRollup();
  renderMilestones();
  renderStats();
  renderNotes();
  renderClock();
}

async function markTodayPerfect() {
  const todayKey = formatKey(new Date());
  const log = ensureLogEntry(todayKey);
  const promises = state.habits.map((h) => 
    updateHabitLog(todayKey, h.id, true)
  );
  try {
    await Promise.all(promises);
    state.habits.forEach((h) => (log.habits[h.id] = true));
    if (!log.note) {
      log.note = 'Marked as perfect day.';
      await updateDailyNote(todayKey, log.note);
    }
    refreshUI();
  } catch (error) {
    alert('Failed to mark today as perfect. Please try again.');
  }
}

function updateSyncStatus(text) {
  const el = document.getElementById('sync-status');
  if (el) {
    el.textContent = text;
    if (text === 'Synced' || text === 'Connected') {
      el.className = 'sync synced';
    } else if (text.includes('error') || text.includes('error')) {
      el.className = 'sync error';
    } else {
      el.className = 'sync';
    }
  }
}

function resetHabitForm() {
  editingHabitId = null;
  document.getElementById('habit-name').value = '';
  document.getElementById('habit-icon').value = '';
  document.getElementById('habit-category').value = '';
  document.getElementById('habit-submit').textContent = 'Add habit';
  document.getElementById('cancel-edit').hidden = true;
}

function startEditHabit(habit) {
  editingHabitId = habit.id;
  document.getElementById('habit-name').value = habit.name;
  document.getElementById('habit-icon').value = habit.icon;
  document.getElementById('habit-category').value = habit.category;
  document.getElementById('habit-submit').textContent = 'Save changes';
  document.getElementById('cancel-edit').hidden = false;
}

function attachHandlers() {
  document.getElementById('mark-today').addEventListener('click', markTodayPerfect);
  
  const notesTextarea = document.getElementById('notes');
  let notesTimeout;
  notesTextarea.addEventListener('input', () => {
    state.notes = notesTextarea.value;
    document.getElementById('notes-status').textContent = 'Unsaved';
    clearTimeout(notesTimeout);
    notesTimeout = setTimeout(async () => {
      try {
        await updateGlobalNotes(state.notes);
        document.getElementById('notes-status').textContent = 'Saved';
      } catch (error) {
        document.getElementById('notes-status').textContent = 'Error';
      }
    }, 500);
  });
  
  document.getElementById('save-notes').addEventListener('click', async () => {
    state.notes = notesTextarea.value;
    try {
      await updateGlobalNotes(state.notes);
      document.getElementById('notes-status').textContent = 'Saved';
    } catch (error) {
      alert('Failed to save notes. Please try again.');
    }
  });

  // Notes modal handlers
  const viewAllNotesBtn = document.getElementById('view-all-notes');
  const notesModal = document.getElementById('notes-modal');
  const closeNotesModalBtn = document.getElementById('close-notes-modal');
  const notesEditor = document.getElementById('notes-editor');
  const saveNotesEditorBtn = document.getElementById('save-notes-editor');
  const notesEditorStatus = document.getElementById('notes-editor-status');

  if (viewAllNotesBtn) {
    viewAllNotesBtn.addEventListener('click', () => {
      openNotesModal();
    });
  }

  if (closeNotesModalBtn) {
    closeNotesModalBtn.addEventListener('click', () => {
      closeNotesModal();
    });
  }

  if (notesModal) {
    notesModal.addEventListener('click', (event) => {
      if (event.target === notesModal) {
        closeNotesModal();
      }
    });
  }

  if (notesEditor) {
    let notesEditorTimeout;
    notesEditor.addEventListener('input', () => {
      notesEditorStatus.textContent = 'Unsaved changes';
      clearTimeout(notesEditorTimeout);
      notesEditorTimeout = setTimeout(async () => {
        try {
          await updateGlobalNotes(notesEditor.value);
          notesEditorStatus.textContent = 'Auto-saved';
          state.notes = notesEditor.value;
        } catch (error) {
          notesEditorStatus.textContent = 'Save error';
        }
      }, 1000);
    });
  }

  if (saveNotesEditorBtn) {
    saveNotesEditorBtn.addEventListener('click', async () => {
      try {
        await updateGlobalNotes(notesEditor.value);
        notesEditorStatus.textContent = 'Saved';
        state.notes = notesEditor.value;
        // Also update the main notes textarea
        notesTextarea.value = notesEditor.value;
        document.getElementById('notes-status').textContent = 'Saved';
      } catch (error) {
        alert('Failed to save notes. Please try again.');
      }
    });
  }

  // Close modals on ESC key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const notesBackdrop = document.getElementById('notes-modal');
      const monthBackdrop = document.getElementById('month-modal');
      
      if (notesBackdrop && !notesBackdrop.hidden) {
        closeNotesModal();
      } else if (monthBackdrop && !monthBackdrop.hidden) {
        closeMonthModal();
      }
    }
  });
  
  document.getElementById('clear-data').addEventListener('click', async () => {
    const confirmed = confirm('Clear all habit data? This cannot be undone.');
    if (!confirmed) return;
    try {
      // Delete all habits (which will cascade delete logs)
      const deletePromises = state.habits.map(h => deleteHabit(h.id));
      await Promise.all(deletePromises);
      state.habits = [];
      state.habitLog = {};
      state.notes = '';
      await updateGlobalNotes('');
      refreshUI();
    } catch (error) {
      alert('Failed to clear data. Please try again.');
    }
  });
  
  const habitForm = document.getElementById('habit-form');
  if (!habitForm) {
    console.error('Habit form not found!');
    return;
  }
  
  habitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Form submitted');
    
    const submitButton = document.getElementById('habit-submit');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    const name = document.getElementById('habit-name').value.trim();
    const icon = document.getElementById('habit-icon').value.trim() || '•';
    const category = document.getElementById('habit-category').value.trim() || 'General';
    
    if (!name) {
      alert('Please enter a habit name');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
      return;
    }
    
    console.log('Saving habit:', { name, icon, category, editingHabitId });
    
    try {
      if (editingHabitId) {
        const target = state.habits.find((h) => h.id === editingHabitId);
        if (target) {
          await saveHabit({ id: editingHabitId, name, icon, category });
        }
      } else {
        const id = `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
        console.log('Creating new habit with ID:', id);
        await saveHabit({ id, name, icon, category });
      }
      console.log('Habit saved successfully');
      resetHabitForm();
      await loadState();
      refreshUI();
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    } catch (error) {
      console.error('Error saving habit:', error);
      alert(`Failed to save habit: ${error.message}\n\nPlease check:\n1. Server is running on port 3000\n2. Browser console for details`);
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  });
  
  document.getElementById('cancel-edit').addEventListener('click', () => {
    resetHabitForm();
  });
  
  const modalBackdrop = document.getElementById('month-modal');
  if (modalBackdrop) {
    // Close on backdrop click
    modalBackdrop.addEventListener('click', (event) => {
      if (event.target === modalBackdrop) {
        event.preventDefault();
        event.stopPropagation();
        closeMonthModal();
      }
    });
    
    // Prevent clicks inside modal from closing it
    const modal = modalBackdrop.querySelector('.modal');
    if (modal) {
      modal.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    }
  }
  
  const closeModalBtn = document.getElementById('close-modal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMonthModal();
    });
  }
  
  // Close modals on ESC key (handled in notes modal section above)
  
  const openCurrentMonthBtn = document.getElementById('open-current-month');
  if (openCurrentMonthBtn) openCurrentMonthBtn.addEventListener('click', () => openMonthModal(new Date().getMonth()));

  // Update clock every second
  setInterval(() => {
    renderClock();
  }, 1000);
  
  // Refresh UI every 30 seconds to catch any missed updates
  setInterval(() => {
    refreshUI();
  }, 30000);
}

async function init() {
  console.log('Initializing Habit Tracker...');
  console.log('API Base:', API_BASE);
  console.log('WebSocket URL:', WS_URL);
  console.log('Current URL:', window.location.href);
  
  // Ensure modal is closed on init
  const modalBackdrop = document.getElementById('month-modal');
  if (modalBackdrop) {
    modalBackdrop.hidden = true;
    modalBackdrop.style.display = 'none';
  }
  
  // Check if server is reachable
  try {
    const healthCheck = await fetch(`${API_BASE}/api/health`);
    if (!healthCheck.ok) {
      throw new Error('Server health check failed');
    }
    console.log('Server is reachable');
  } catch (error) {
    console.error('Cannot reach server:', error);
    alert('⚠️ Cannot connect to server!\n\nPlease make sure:\n1. Server is running: npm start\n2. Server is on port 3000\n3. No firewall blocking the connection\n\nCheck browser console (F12) for details.');
    updateSyncStatus('Server offline');
  }
  
  try {
    await loadState();
    connectWebSocket();
    attachHandlers();
    refreshUI();
    updateSyncStatus('Synced');
    console.log('Initialization complete');
  } catch (error) {
    console.error('Initialization error:', error);
    alert('Failed to initialize app. Please check the console for details.');
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
