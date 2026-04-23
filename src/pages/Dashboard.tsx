
import { useNavigate } from 'react-router-dom';
import HabitGrid from '../components/HabitGrid';
import MetricsChart from '../components/MetricsChart';
import JournalLog from '../components/JournalLog';
import { LogOut, Activity } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="layout-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.75rem', fontWeight: 600 }}>
          <Activity color="var(--accent-color)" size={32} />
          Lavenbloom
        </h1>
        <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
          <LogOut size={18} /> Logout
        </button>
      </header>

      <div className="grid-container">
        <div style={{ gridColumn: '1 / -1' }}>
          <HabitGrid />
        </div>
        <div>
          <MetricsChart />
        </div>
        <div>
          <JournalLog />
        </div>
      </div>
    </div>
  );
}
