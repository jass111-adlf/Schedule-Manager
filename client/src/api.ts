import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // sends the HttpOnly cookie automatically
});

// Redirect to /login on any 401
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
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start: string;
  end: string;
  allDay: boolean;
  visibility: string;
  eventType: string;
  reminderMinutesBefore: number | null;
  reminderMethod: string | null;
  timezone: string;
  recurrenceType: string;
  repeatUntil: string | null;
  createdBy: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface Invitation {
  id: string;
  eventId: string;
  invitedUserId: string;
  invitationStatus: 'pending' | 'accepted' | 'declined';
  invitedAt: string;
  event: { id: string; title: string; owner: { id: string; name: string; email: string } };
}

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
  search: (email: string) => api.get<{ data: { users: User[] } }>('/users/search', { params: { email } }),
};

// ── Events ────────────────────────────────────────────────────

export const eventsApi = {
  list: (start?: string, end?: string) =>
    api.get<{ data: { events: Event[] } }>('/events', { params: { start, end } }),

  get: (id: string) => api.get<{ data: { event: Event } }>(`/events/${id}`),

  create: (data: Partial<Event> & { startDatetime: string; endDatetime: string }) =>
    api.post<{ data: { event: Event } }>('/events', data),

  update: (id: string, data: Partial<Event>) =>
    api.put<{ data: { event: Event } }>(`/events/${id}`, data),

  cancel: (id: string) => api.patch(`/events/${id}/cancel`),

  delete: (id: string) => api.delete(`/events/${id}`),

  invite: (eventId: string, userId: string) =>
    api.post(`/events/${eventId}/invitations`, { userId }),
};

// ── Invitations ───────────────────────────────────────────────

export const invitationsApi = {
  received: () => api.get<{ data: { invitations: Invitation[] } }>('/invitations/received'),
  accept: (id: string) => api.patch(`/invitations/${id}/accept`),
  decline: (id: string) => api.patch(`/invitations/${id}/decline`),
};

// ── Reminders ─────────────────────────────────────────────────

export const remindersApi = {
  due: () => api.get<{ data: { reminders: { id: string; event: { id: string; title: string } }[] } }>('/reminders/due'),
  acknowledge: (id: string) => api.patch(`/reminders/${id}/acknowledge`),
};

// ── Dashboard ─────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get<{ data: { todayEvents: Event[]; upcomingEvents: Event[]; recentInvitations: Invitation[] } }>('/dashboard'),
};

export default api;
