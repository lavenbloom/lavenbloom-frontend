import HabitGrid from '../components/HabitGrid';
import MetricsChart from '../components/MetricsChart';
import Navbar from '../components/Navbar';

export default function Dashboard() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="page-content">
        <div className="page-header">
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Track your habits and metrics.</p>
        </div>
        <div className="grid-container">
          <div style={{ gridColumn: '1 / -1' }}>
            <HabitGrid />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <MetricsChart />
          </div>
        </div>
      </main>
    </div>
  );
}
