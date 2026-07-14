import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() { await logout(); navigate('/login'); }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `text-sm px-3 py-1.5 rounded-pill transition-colors ${
      isActive
        ? 'bg-coral-tint text-coral-dark font-medium'
        : 'text-ink-muted hover:bg-warm-card hover:text-ink'
    }`;

  return (
    <div className="min-h-screen bg-warm-bg">
      <nav className="bg-white border-b border-warm-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-semibold text-coral-dark mr-4">Calendar</span>
          <NavLink to="/"         className={navLink}>Dashboard</NavLink>
          <NavLink to="/calendar" className={navLink}>Calendar</NavLink>
          <NavLink to="/people"   className={navLink}>People</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <NavLink to="/profile" className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-coral-dark"
              style={{ backgroundColor: '#f5c4b3' }}
            >
              {initials}
            </span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-pill text-ink-muted hover:bg-warm-card hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
