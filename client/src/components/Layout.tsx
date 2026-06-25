import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-800">📅 Calendar</span>
          <NavLink to="/"        className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}>Dashboard</NavLink>
          <NavLink to="/calendar" className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`}>Calendar</NavLink>
        </div>
        <div className="flex items-center gap-4">
          <NavLink to="/profile" className={({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>{user?.name}</NavLink>
          <button onClick={handleLogout} className="text-sm text-gray-600 hover:text-red-600 transition-colors">
            Sign out
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
