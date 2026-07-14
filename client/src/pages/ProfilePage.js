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
    const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?';
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-sm mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold text-ink mb-6", children: "Profile" }), _jsxs("div", { className: "flex flex-col items-center mb-6", children: [_jsx("span", { className: "w-16 h-16 rounded-full flex items-center justify-center text-xl font-semibold text-coral-dark mb-3", style: { backgroundColor: '#f5c4b3' }, children: initials }), _jsx("p", { className: "text-base font-semibold text-ink", children: user?.name }), _jsx("p", { className: "text-sm text-ink-muted", children: user?.email })] }), _jsxs("div", { className: "bg-white rounded-container border border-warm-border p-5 space-y-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Name" }), _jsx("p", { className: "text-sm font-medium text-ink", children: user?.name })] }), _jsxs("div", { className: "border-t border-warm-border pt-4", children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Email" }), _jsx("p", { className: "text-sm text-ink", children: user?.email })] }), _jsxs("div", { className: "border-t border-warm-border pt-4", children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Member since" }), _jsx("p", { className: "text-sm text-ink", children: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—' })] }), _jsx("button", { onClick: handleLogout, className: "w-full mt-2 py-2 text-sm text-coral-dark border border-coral-soft rounded-pill hover:bg-coral-tint transition-colors", children: "Sign out" })] })] }) }));
}
