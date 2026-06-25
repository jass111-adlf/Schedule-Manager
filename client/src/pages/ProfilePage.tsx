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

  return (
    <Layout>
      <div className="max-w-sm mx-auto">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Profile</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Name</p>
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Email</p>
            <p className="text-sm text-gray-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Member since</p>
            <p className="text-sm text-gray-800">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</p>
          </div>
          <button onClick={handleLogout} className="w-full mt-2 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </Layout>
  );
}
