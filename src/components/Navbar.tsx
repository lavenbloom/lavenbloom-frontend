import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, BookOpen } from 'lucide-react';

function ShamrockIcon({ size = 26 }: Readonly<{ size?: number }>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 115"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="50" cy="22" r="21" fill="#9b6ab2" />
      <circle cx="27" cy="52" r="21" fill="#9b6ab2" />
      <circle cx="73" cy="52" r="21" fill="#9b6ab2" />
      <ellipse cx="50" cy="42" rx="15" ry="15" fill="#9b6ab2" />
      <path
        d="M50 62 Q48 78 44 94"
        stroke="#9b6ab2"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/dashboard" className="navbar-brand">
          <ShamrockIcon size={30} />
          <span className="brand-name">Lavenbloom</span>
        </Link>

        <div className="nav-links">
          <Link
            to="/dashboard"
            className={`nav-link${location.pathname === '/dashboard' ? ' active' : ''}`}
          >
            <LayoutDashboard size={15} />
            Dashboard
          </Link>
          <Link
            to="/journal"
            className={`nav-link${location.pathname === '/journal' ? ' active' : ''}`}
          >
            <BookOpen size={15} />
            Journal
          </Link>
        </div>

        <button onClick={handleLogout} className="nav-logout">
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </nav>
  );
}
