import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

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

export default function HabitGrid() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [habits, setHabits] = useState<any[]>([]);
  const [newHabitName, setNewHabitName] = useState('');

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
        api.get('/habit/habits/logs')
      ]);
      const allLogs = logsRes.data;
      const habitsWithLogs = habitsRes.data.map((h: any) => {
        const logs = allLogs.filter((l: any) => l.habit_id === h.id);
        const logMap: any = {};
        logs.forEach((l: any) => { logMap[l.date] = l.is_done; });
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
      await api.post(`/habit/habits/${habitId}/logs/${date}`, {
        is_done: !currentStatus,
        note: ''
      });
      fetchHabits();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-panel" style={{ overflowX: 'auto' }}>
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
        <button type="submit" className="btn"><Plus size={18}/> Add</button>
      </form>
      <table style={{ borderCollapse: 'collapse', textAlign: 'center', minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: '1rem', paddingRight: '1rem', minWidth: '120px', position: 'sticky', left: 0, background: 'var(--card-bg, #1a1040)', zIndex: 1 }}>
              Habit
            </th>
            {days.map(d => (
              <th key={d} style={{ paddingBottom: '1rem', fontSize: '0.72rem', color: 'var(--text-secondary)', minWidth: '30px', width: '30px' }}>
                {d.substring(8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map(h => (
            <tr key={h.id}>
              <td style={{ textAlign: 'left', padding: '0.5rem 1rem 0.5rem 0', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--card-bg, #1a1040)', zIndex: 1 }}>
                {h.name}
              </td>
              {days.map(d => (
                <td key={d} style={{ padding: '0.25rem' }}>
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
              <td colSpan={days.length + 1} style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
                No habits tracked yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
