import axios from 'axios';

// In dev: VITE_API_URL is not set, so '/api' is used and the Vite proxy forwards to localhost:4000.
// In production: VITE_API_URL = 'https://your-render-app.onrender.com' (set in Cloudflare Pages dashboard).
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL ?? '') + '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  r => r,
  err => {
    const publicPaths = ['/login', '/register'];
    if (err.response?.status === 401 && !publicPaths.includes(window.location.pathname)) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ── Types ─────────────────────────────────────────────────────

export interface User {
  id: string; name: string; email: string; createdAt: string;
  friendshipId?: string | null;
  friendshipStatus?: 'pending' | 'accepted' | null;
  iRequested?: boolean;
}

export interface Event {
  id: string; title: string; description: string | null; location: string | null;
  start: string; end: string; allDay: boolean;
  visibility: string; eventType: string;
  timezone: string; recurrenceType: string; repeatUntil: string | null;
  createdBy: string; status: 'upcoming' | 'completed' | 'cancelled';
  customTypeId: string | null;
  customType: { name: string; color: string } | null;
}

export interface Invitation {
  id: string; eventId: string; invitedUserId: string;
  invitationStatus: 'pending' | 'accepted' | 'declined'; invitedAt: string;
  event: { id: string; title: string; owner: { id: string; name: string; email: string } };
}

export interface CustomEventType {
  id: string; name: string; color: string; createdAt: string;
}

// A profile event: visible = full details, visible = false = grey busy block
export type ProfileEvent =
  | { id: string; visible: true; title: string; description: string | null; location: string | null; start: string; end: string; allDay: boolean; eventType: string; customType: { name: string; color: string } | null; visibility: string; status: string }
  | { id: string; visible: false; start: string; end: string; allDay: boolean };

// ── Auth ──────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ data: { user: User } }>('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post<{ data: { user: User } }>('/auth/login', data),
  logout: () => api.post('/auth/logout'),
};

// ── Users ─────────────────────────────────────────────────────

export const usersApi = {
  me: () => api.get<{ data: { user: User } }>('/users/me'),
  search: (q: string) => api.get<{ data: { users: User[] } }>('/users/search', { params: { q } }),
  getProfile: (userId: string, start?: string, end?: string) =>
    api.get<{ data: { events: ProfileEvent[]; isFriend: boolean } }>(`/users/${userId}/events`, { params: { start, end } }),
};

// ── Events ────────────────────────────────────────────────────

export const eventsApi = {
  list: (start?: string, end?: string) =>
    api.get<{ data: { events: Event[] } }>('/events', { params: { start, end } }),
  get: (id: string) => api.get<{ data: { event: any } }>(`/events/${id}`),
  create: (data: Record<string, unknown>) => api.post<{ data: { event: Event } }>('/events', data),
  update: (id: string, data: Record<string, unknown>) => api.put<{ data: { event: Event } }>(`/events/${id}`, data),
  cancel: (id: string) => api.patch(`/events/${id}/cancel`),
  delete: (id: string) => api.delete(`/events/${id}`),
  invite: (eventId: string, userId: string) => api.post(`/events/${eventId}/invitations`, { userId }),
};

// ── Invitations ───────────────────────────────────────────────

export const invitationsApi = {
  received: () => api.get<{ data: { invitations: Invitation[] } }>('/invitations/received'),
  accept:  (id: string) => api.patch(`/invitations/${id}/accept`),
  decline: (id: string) => api.patch(`/invitations/${id}/decline`),
};

// ── Dashboard ─────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get<{ data: { todayEvents: Event[]; upcomingEvents: Event[]; recentInvitations: Invitation[] } }>('/dashboard'),
};

// ── Friends ───────────────────────────────────────────────────

export const friendsApi = {
  list: () => api.get<{ data: { friends: (User & { friendshipId: string })[] } }>('/friends'),
  requests: () => api.get<{ data: { requests: { id: string; requester: User; createdAt: string }[] } }>('/friends/requests'),
  sendRequest: (userId: string) => api.post('/friends/request', { userId }),
  accept: (id: string) => api.patch(`/friends/${id}/accept`),
  remove: (id: string) => api.delete(`/friends/${id}`),
};

// ── Custom Event Types ────────────────────────────────────────

export const eventTypesApi = {
  list: () => api.get<{ data: { types: CustomEventType[] } }>('/event-types'),
  create: (data: { name: string; color: string }) =>
    api.post<{ data: { type: CustomEventType } }>('/event-types', data),
  update: (id: string, data: Partial<{ name: string; color: string }>) =>
    api.put<{ data: { type: CustomEventType } }>(`/event-types/${id}`, data),
  delete: (id: string) => api.delete(`/event-types/${id}`),
};

export default api;
