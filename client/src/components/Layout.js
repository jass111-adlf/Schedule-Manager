import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    async function handleLogout() { await logout(); navigate('/login'); }
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
    const navLink = ({ isActive }) => `text-sm px-3 py-1.5 rounded-pill transition-colors ${isActive
        ? 'bg-coral-tint text-coral-dark font-medium'
        : 'text-ink-muted hover:bg-warm-card hover:text-ink'}`;
    return (_jsxs("div", { className: "min-h-screen bg-warm-bg", children: [_jsxs("nav", { className: "bg-white border-b border-warm-border px-6 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "text-lg font-bold text-coral-dark mr-4 tracking-tight", children: "Sched-It" }), _jsx(NavLink, { to: "/", className: navLink, children: "Dashboard" }), _jsx(NavLink, { to: "/calendar", className: navLink, children: "Calendar" }), _jsx(NavLink, { to: "/people", className: navLink, children: "People" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx(NavLink, { to: "/profile", className: "flex items-center gap-2 text-sm text-ink-muted hover:text-ink", children: _jsx("span", { className: "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-coral-dark", style: { backgroundColor: '#f5c4b3' }, children: initials }) }), _jsx("button", { onClick: handleLogout, className: "text-sm px-3 py-1.5 rounded-pill text-ink-muted hover:bg-warm-card hover:text-ink transition-colors", children: "Sign out" })] })] }), _jsx("main", { className: "max-w-6xl mx-auto px-6 py-6", children: children })] }));
}
