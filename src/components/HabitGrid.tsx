import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus } from 'lucide-react';

export default function HabitGrid() {
  const [habits, setHabits] = useState<any[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  
  // Last 7 days for the grid
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  useEffect(() => {
    fetchHabits();
  }, []);

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
        logs.forEach((l: any) => logMap[l.date] = l.is_done);
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
      <div className="header">
        <h3>Habit Grid (Last 7 Days)</h3>
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
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', paddingBottom: '1rem' }}>Habit</th>
            {days.map(d => (
              <th key={d} style={{ paddingBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {d.substring(5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {habits.map(h => (
            <tr key={h.id}>
              <td style={{ textAlign: 'left', padding: '0.75rem 0', fontWeight: 500 }}>{h.name}</td>
              {days.map(d => (
                <td key={d}>
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
              <td colSpan={8} style={{ padding: '2rem', color: 'var(--text-secondary)' }}>No habits tracked yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
