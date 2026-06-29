import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { authApi, usersApi } from './api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // Restore session on page load
    useEffect(() => {
        usersApi.me()
            .then(r => setUser(r.data.data.user))
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, []);
    const login = async (email, password) => {
        const r = await authApi.login({ email, password });
        setUser(r.data.data.user);
    };
    const register = async (name, email, password) => {
        const r = await authApi.register({ name, email, password });
        setUser(r.data.data.user);
    };
    const logout = async () => {
        await authApi.logout();
        setUser(null);
    };
    return (_jsx(AuthContext.Provider, { value: { user, loading, login, register, logout }, children: children }));
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
