import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../auth';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-ink mb-6">Profile</h1>

        <div className="flex flex-col items-center mb-6">
          <span
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold text-coral-dark mb-3"
            style={{ backgroundColor: '#f5c4b3' }}
          >
            {initials}
          </span>
          <p className="text-base font-semibold text-ink">{user?.name}</p>
          <p className="text-sm text-ink-muted">{user?.email}</p>
        </div>

        <div className="bg-white rounded-container border border-warm-border p-5 space-y-4">
          <div>
            <p className="text-xs text-ink-muted mb-0.5">Name</p>
            <p className="text-sm font-medium text-ink">{user?.name}</p>
          </div>
          <div className="border-t border-warm-border pt-4">
            <p className="text-xs text-ink-muted mb-0.5">Email</p>
            <p className="text-sm text-ink">{user?.email}</p>
          </div>
          <div className="border-t border-warm-border pt-4">
            <p className="text-xs text-ink-muted mb-0.5">Member since</p>
            <p className="text-sm text-ink">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-2 py-2 text-sm text-coral-dark border border-coral-soft rounded-pill hover:bg-coral-tint transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </Layout>
  );
}
