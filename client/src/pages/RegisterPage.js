import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
export default function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(name, email, password);
            navigate('/');
        }
        catch (err) {
            const msg = err?.response?.data?.message;
            setError(msg ?? 'Registration failed. Please try again.');
        }
        finally {
            setLoading(false);
        }
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center px-4", children: _jsxs("div", { className: "w-full max-w-sm bg-white rounded-2xl shadow p-8", children: [_jsx("h1", { className: "text-2xl font-semibold text-gray-800 mb-6", children: "Create account" }), error && _jsx("p", { className: "mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Name" }), _jsx("input", { type: "text", required: true, value: name, onChange: e => setName(e.target.value), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", required: true, value: email, onChange: e => setEmail(e.target.value), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Password" }), _jsx("input", { type: "password", required: true, minLength: 8, value: password, onChange: e => setPassword(e.target.value), className: "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors", children: loading ? 'Creating account…' : 'Create account' })] }), _jsxs("p", { className: "mt-5 text-center text-sm text-gray-500", children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", className: "text-blue-600 hover:underline", children: "Sign in" })] })] }) }));
}
