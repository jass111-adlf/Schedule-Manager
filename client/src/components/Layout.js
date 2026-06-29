import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    async function handleLogout() { await logout(); navigate('/login'); }
    const link = ({ isActive }) => `text-sm ${isActive ? 'text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-800'}`;
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("nav", { className: "bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-5", children: [_jsx("span", { className: "font-semibold text-gray-800", children: "\uD83D\uDCC5 Calendar" }), _jsx(NavLink, { to: "/", className: link, children: "Dashboard" }), _jsx(NavLink, { to: "/calendar", className: link, children: "Calendar" }), _jsx(NavLink, { to: "/people", className: link, children: "People" })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx(NavLink, { to: "/profile", className: link, children: user?.name }), _jsx("button", { onClick: handleLogout, className: "text-sm text-gray-600 hover:text-red-600 transition-colors", children: "Sign out" })] })] }), _jsx("main", { className: "max-w-6xl mx-auto px-6 py-6", children: children })] }));
}
