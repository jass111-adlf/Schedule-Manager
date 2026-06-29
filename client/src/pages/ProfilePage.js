import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-sm mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-800 mb-6", children: "Profile" }), _jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 mb-0.5", children: "Name" }), _jsx("p", { className: "text-sm font-medium text-gray-800", children: user?.name })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 mb-0.5", children: "Email" }), _jsx("p", { className: "text-sm text-gray-800", children: user?.email })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 mb-0.5", children: "Member since" }), _jsx("p", { className: "text-sm text-gray-800", children: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' })] }), _jsx("button", { onClick: handleLogout, className: "w-full mt-2 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors", children: "Sign out" })] })] }) }));
}
