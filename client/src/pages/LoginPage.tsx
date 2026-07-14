import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-[20px] p-8">
        <h1 className="text-2xl font-semibold text-ink mb-1">Welcome back</h1>
        <p className="text-sm text-ink-muted mb-6">Sign in to your calendar</p>

        {error && (
          <p className="mb-4 text-sm text-coral-dark bg-coral-tint rounded-card px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-warm-border rounded-[10px] px-3 py-2 text-sm text-ink focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Password</label>
            <input
              type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-warm-border rounded-[10px] px-3 py-2 text-sm text-ink focus:outline-none focus:border-coral transition-colors"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-coral hover:bg-coral-hover text-white rounded-pill py-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-muted">
          No account?{' '}
          <Link to="/register" className="text-coral-dark hover:underline font-medium">Create one</Link>
        </p>
      </div>
    </div>
  );
}
