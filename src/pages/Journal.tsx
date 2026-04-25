import Navbar from '../components/Navbar';
import JournalLog from '../components/JournalLog';

export default function Journal() {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="page-content">
        <div className="page-header">
          <h2 className="page-title">Journal</h2>
          <p className="page-subtitle">Your thoughts, captured daily.</p>
        </div>
        <JournalLog />
      </main>
    </div>
  );
}
