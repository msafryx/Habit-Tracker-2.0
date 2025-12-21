# Habit Tracker 2.0

A live, front-end habit tracker that uses real dates/times, updates weekly and monthly views automatically, and lets you add, edit, or delete any habit. Data is stored in your browser (localStorage) so changes persist without a backend.

## Features
- **Real-time tracking:** Shows today’s date/time and recalculates week/month averages instantly.
- **Daily logging:** Check off habits for each day and add inline notes.
- **Weekly chart & rollups:** Visual progress for the current week plus averages.
- **Monthly overview:** Daily completion bars across the current month.
- **Annual overview:** Month-by-month cards with click-through daily detail.
- **Streak milestones:** Automatic badges for perfect-day streaks (5–100 days).
- **Habit CRUD:** Add new habits, edit names/icons/categories inline, or delete ones you don’t need.
- **Persistent sync:** All changes are saved automatically in `localStorage`.

## Getting started
1. Open `index.html` in your browser (no build step required).
2. Add your habits via the **Add habit** form, or keep the starter set.
3. Check boxes in **Week overview** to log completions; stats and charts update immediately.
4. Use **Clear all data** to reset everything to the starter configuration.

Your data stays in the same browser where you use the app. To move it elsewhere, copy the `habit-tracker-2.0` value from DevTools → Application → Local Storage.
