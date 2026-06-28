import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import LoginPage       from './pages/LoginPage';
import RegisterPage    from './pages/RegisterPage';
import DashboardPage   from './pages/DashboardPage';
import CalendarPage    from './pages/CalendarPage';
import PeoplePage         from './pages/PeoplePage';
import UserCalendarPage   from './pages/UserCalendarPage';
import EventDetailPage    from './pages/EventDetailPage';
import EventFormPage   from './pages/EventFormPage';
import ProfilePage     from './pages/ProfilePage';
import NotificationManager from './components/NotificationManager';

const Spinner = () => (
  <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading…</div>
);

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationManager />
        <Routes>
          <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

          <Route path="/"                element={<Protected><DashboardPage /></Protected>} />
          <Route path="/calendar"        element={<Protected><CalendarPage /></Protected>} />
          <Route path="/people"            element={<Protected><PeoplePage /></Protected>} />
          <Route path="/people/:userId"   element={<Protected><UserCalendarPage /></Protected>} />
          <Route path="/events/new"      element={<Protected><EventFormPage /></Protected>} />
          <Route path="/events/:id"      element={<Protected><EventDetailPage /></Protected>} />
          <Route path="/events/:id/edit" element={<Protected><EventFormPage /></Protected>} />
          <Route path="/profile"         element={<Protected><ProfilePage /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
