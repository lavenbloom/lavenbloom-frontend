import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Plus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const m = String(month + 1).padStart(2, '0');
    return `${year}-${m}-${day}`;
  });
}

const DEMO_HABITS = [
  { name: 'Gym',        daysOn: [1,3,5,8,10,12,15,17,19,21,22,24] },
  { name: 'Running',    daysOn: [2,5,8,11,14,17,20,23] },
  { name: 'Meditation', daysOn: [1,2,4,6,8,10,12,14,16,18,20,22,24] },
  { name: 'Water (2L)', daysOn: [1,2,3,4,5,6,7,8,9,10,11,12,14,15,16,17,18,19,21,22,23,24] },
];
const DEMO_WEIGHT = [70.2,69.8,70.1,69.5,69.8,70.3,70.0,69.7,69.4,70.0,69.6,70.2,69.9,69.5,70.1];
const DEMO_SLEEP  = [7.5,6.0,8.0,7.0,6.5,7.5,8.0,6.0,7.5,8.0,7.0,6.5,7.5,8.0,7.5];

const STICKY_BG = '#251e55';

export default function HabitGrid() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [habits, setHabits] = useState<any[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [seeding, setSeeding] = useState(false);

  const days = getDaysInMonth(viewYear, viewMonth);

  const goToPrevMonth = useCallback(() => {
    if (viewMonth === 0) {
      setViewYear((y: number) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m: number) => m - 1);
    }
  }, [viewMonth]);

  const goToNextMonth = useCallback(() => {
    if (viewMonth === 11) {
      setViewYear((y: number) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m: number) => m + 1);
    }
  }, [viewMonth]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevMonth();
      else if (e.key === 'ArrowRight') goToNextMonth();
    };
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, [goToPrevMonth, goToNextMonth]);

  useEffect(() => {
    fetchHabits();
  }, [viewYear, viewMonth]);

  const fetchHabits = async () => {
    try {
      const [habitsRes, logsRes] = await Promise.all([
        api.get('/habit/habits'),
        api.get('/habit/habits/logs'),
      ]);
      const allLogs = logsRes.data;
      const habitsWithLogs = habitsRes.data.map((h: any) => {
        const logMap: any = {};
        allLogs.filter((l: any) => l.habit_id === h.id).forEach((l: any) => { logMap[l.date] = l.is_done; });
        return { ...h, logs: logMap };
      });
      setHabits(habitsWithLogs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName) return;
    try {
      await api.post('/habit/habits', { name: newHabitName, description: '' });
      setNewHabitName('');
      fetchHabits();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleHabit = async (habitId: number, date: string, currentStatus: boolean) => {
    try {
      await api.post(`/habit/habits/${habitId}/logs/${date}`, { is_done: !currentStatus, note: '' });
      fetchHabits();
    } catch (err) {
      console.error(err);
    }
  };

  const seedDemoData = async () => {
    setSeeding(true);
    try {
      const yr = today.getFullYear();
      const mo = today.getMonth();
      const maxDay = today.getDate();

      for (const def of DEMO_HABITS) {
        let habitId: number;
        try {
          const res = await api.post('/habit/habits', { name: def.name, description: '' });
          habitId = res.data.id;
        } catch { continue; }
        for (const day of def.daysOn) {
          if (day > maxDay) continue;
          const d = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          try { await api.post(`/habit/habits/${habitId}/logs/${d}`, { is_done: true, note: '' }); } catch { /* skip */ }
        }
      }

      for (let i = 0; i < Math.min(DEMO_WEIGHT.length, maxDay); i++) {
        const d = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        try { await api.post(`/habit/metrics/${d}`, { metric_type: 'weight', value: DEMO_WEIGHT[i] }); } catch { /* skip */ }
        try { await api.post(`/habit/metrics/${d}`, { metric_type: 'sleep', value: DEMO_SLEEP[i] }); } catch { /* skip */ }
      }

      fetchHabits();
    } catch (err) {
      console.error(err);
    }
    setSeeding(false);
  };

  return (
    <div className="glass-panel">
      <div className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={goToPrevMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <ChevronLeft size={20} />
          </button>
          <h3 style={{ margin: 0 }}>{MONTH_NAMES[viewMonth]} {viewYear}</h3>
          <button
            onClick={goToNextMonth}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.25rem' }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Use ← → arrow keys to navigate</span>
      </div>

      <form onSubmit={handleAddHabit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder="New Habit..."
          value={newHabitName}
          onChange={e => setNewHabitName(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn"><Plus size={18} /> Add</button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', textAlign: 'center', width: '100%', tableLayout: 'fixed' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: '0.5rem', paddingLeft: '0.5rem', paddingRight: '0.75rem', width: '130px', position: 'sticky', left: 0, background: STICKY_BG, zIndex: 2 }}>
                Habit
              </th>
              {days.map(d => (
                <th key={d} style={{ paddingBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {d.substring(8)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map(h => (
              <tr key={h.id}>
                <td style={{ textAlign: 'left', padding: '0.35rem 0.75rem 0.35rem 0.5rem', fontWeight: 500, fontSize: '0.875rem', position: 'sticky', left: 0, background: STICKY_BG, zIndex: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {h.name}
                </td>
                {days.map(d => (
                  <td key={d} style={{ padding: '3px 0', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      className="habit-checkbox"
                      checked={h.logs[d] || false}
                      onChange={() => toggleHabit(h.id, d, h.logs[d] || false)}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {habits.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} style={{ padding: '2.5rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <span>No habits tracked yet.</span>
                    <button onClick={seedDemoData} disabled={seeding} className="btn" style={{ gap: '0.4rem' }}>
                      <Sparkles size={15} />
                      {seeding ? 'Seeding demo data…' : 'Load Demo Data'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
