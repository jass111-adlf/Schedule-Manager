import axios from 'axios';
// In dev: VITE_API_URL is not set, so '/api' is used and the Vite proxy forwards to localhost:4000.
// In production: VITE_API_URL = 'https://your-render-app.onrender.com' (set in Cloudflare Pages dashboard).
const api = axios.create({
    baseURL: (import.meta.env.VITE_API_URL ?? '') + '/api',
    withCredentials: true,
});
api.interceptors.response.use(r => r, err => {
    const publicPaths = ['/login', '/register'];
    if (err.response?.status === 401 && !publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
    }
    return Promise.reject(err);
});
// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
};
// ── Users ─────────────────────────────────────────────────────
export const usersApi = {
    me: () => api.get('/users/me'),
    search: (q) => api.get('/users/search', { params: { q } }),
    getProfile: (userId, start, end) => api.get(`/users/${userId}/events`, { params: { start, end } }),
};
// ── Events ────────────────────────────────────────────────────
export const eventsApi = {
    list: (start, end) => api.get('/events', { params: { start, end } }),
    get: (id) => api.get(`/events/${id}`),
    create: (data) => api.post('/events', data),
    update: (id, data) => api.put(`/events/${id}`, data),
    cancel: (id) => api.patch(`/events/${id}/cancel`),
    delete: (id) => api.delete(`/events/${id}`),
    invite: (eventId, userId) => api.post(`/events/${eventId}/invitations`, { userId }),
};
// ── Invitations ───────────────────────────────────────────────
export const invitationsApi = {
    received: () => api.get('/invitations/received'),
    accept: (id) => api.patch(`/invitations/${id}/accept`),
    decline: (id) => api.patch(`/invitations/${id}/decline`),
};
// ── Reminders ─────────────────────────────────────────────────
export const remindersApi = {
    due: () => api.get('/reminders/due'),
    acknowledge: (id) => api.patch(`/reminders/${id}/acknowledge`),
};
// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
    get: () => api.get('/dashboard'),
};
// ── Friends ───────────────────────────────────────────────────
export const friendsApi = {
    list: () => api.get('/friends'),
    requests: () => api.get('/friends/requests'),
    sendRequest: (userId) => api.post('/friends/request', { userId }),
    accept: (id) => api.patch(`/friends/${id}/accept`),
    remove: (id) => api.delete(`/friends/${id}`),
};
// ── Custom Event Types ────────────────────────────────────────
export const eventTypesApi = {
    list: () => api.get('/event-types'),
    create: (data) => api.post('/event-types', data),
    update: (id, data) => api.put(`/event-types/${id}`, data),
    delete: (id) => api.delete(`/event-types/${id}`),
};
export default api;
