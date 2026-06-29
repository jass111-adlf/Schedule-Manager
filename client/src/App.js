import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import PeoplePage from './pages/PeoplePage';
import UserCalendarPage from './pages/UserCalendarPage';
import EventDetailPage from './pages/EventDetailPage';
import EventFormPage from './pages/EventFormPage';
import ProfilePage from './pages/ProfilePage';
import NotificationManager from './components/NotificationManager';
const Spinner = () => (_jsx("div", { className: "min-h-screen flex items-center justify-center text-gray-500 text-sm", children: "Loading\u2026" }));
function Protected({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx(Spinner, {});
    return user ? _jsx(_Fragment, { children: children }) : _jsx(Navigate, { to: "/login", replace: true });
}
function PublicRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading)
        return _jsx(Spinner, {});
    return user ? _jsx(Navigate, { to: "/", replace: true }) : _jsx(_Fragment, { children: children });
}
export default function App() {
    return (_jsx(AuthProvider, { children: _jsxs(BrowserRouter, { children: [_jsx(NotificationManager, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(PublicRoute, { children: _jsx(LoginPage, {}) }) }), _jsx(Route, { path: "/register", element: _jsx(PublicRoute, { children: _jsx(RegisterPage, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Protected, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "/calendar", element: _jsx(Protected, { children: _jsx(CalendarPage, {}) }) }), _jsx(Route, { path: "/people", element: _jsx(Protected, { children: _jsx(PeoplePage, {}) }) }), _jsx(Route, { path: "/people/:userId", element: _jsx(Protected, { children: _jsx(UserCalendarPage, {}) }) }), _jsx(Route, { path: "/events/new", element: _jsx(Protected, { children: _jsx(EventFormPage, {}) }) }), _jsx(Route, { path: "/events/:id", element: _jsx(Protected, { children: _jsx(EventDetailPage, {}) }) }), _jsx(Route, { path: "/events/:id/edit", element: _jsx(Protected, { children: _jsx(EventFormPage, {}) }) }), _jsx(Route, { path: "/profile", element: _jsx(Protected, { children: _jsx(ProfilePage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] })] }) }));
}
