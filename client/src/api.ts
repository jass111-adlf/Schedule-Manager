import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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
  reminderMinutesBefore: number | null; reminderMethod: string | null;
  timezone: string; recurrenceType: string; repeatUntil: string | null;
  createdBy: string; status: 'upcoming' | 'completed' | 'cancelled';
  calendarId: string | null; customTypeId: string | null;
  customType: { name: string; color: string } | null;
}

export interface Invitation {
  id: string; eventId: string; invitedUserId: string;
  invitationStatus: 'pending' | 'accepted' | 'declined'; invitedAt: string;
  event: { id: string; title: string; owner: { id: string; name: string; email: string } };
}

export interface Calendar {
  id: string; name: string; color: string;
  visibility: 'public' | 'private' | 'share_only'; createdAt: string;
  shares?: { id: string; sharedWith: { id: string; name: string; email: string }; createdAt: string }[];
}

export interface CustomEventType {
  id: string; name: string; color: string; createdAt: string;
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
  search: (q: string) => api.get<{ data: { users: User[] } }>('/users/search', { params: { q } }),
  getCalendars: (userId: string) =>
    api.get<{ data: { calendars: Calendar[]; isFriend: boolean } }>(`/users/${userId}/calendars`),
};

// ── Events ────────────────────────────────────────────────────

export const eventsApi = {
  list: (start?: string, end?: string, calendarId?: string) =>
    api.get<{ data: { events: Event[] } }>('/events', { params: { start, end, calendarId } }),
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

// ── Reminders ─────────────────────────────────────────────────

export const remindersApi = {
  due: () => api.get<{ data: { reminders: { id: string; event: { id: string; title: string } }[] } }>('/reminders/due'),
  acknowledge: (id: string) => api.patch(`/reminders/${id}/acknowledge`),
};

// ── Dashboard ─────────────────────────────────────────────────

export const dashboardApi = {
  get: () => api.get<{ data: { todayEvents: Event[]; upcomingEvents: Event[]; recentInvitations: Invitation[] } }>('/dashboard'),
};

// ── Calendars ─────────────────────────────────────────────────

export const calendarsApi = {
  list: () => api.get<{ data: { calendars: Calendar[] } }>('/calendars'),
  sharedWithMe: () => api.get<{ data: { calendars: (Calendar & { owner?: User })[] } }>('/calendars/shared-with-me'),
  create: (data: { name: string; color: string; visibility: string }) =>
    api.post<{ data: { calendar: Calendar } }>('/calendars', data),
  update: (id: string, data: Partial<{ name: string; color: string; visibility: string }>) =>
    api.put<{ data: { calendar: Calendar } }>(`/calendars/${id}`, data),
  delete: (id: string) => api.delete(`/calendars/${id}`),
  share: (calendarId: string, userId: string) =>
    api.post(`/calendars/${calendarId}/shares`, { userId }),
  revokeShare: (calendarId: string, userId: string) =>
    api.delete(`/calendars/${calendarId}/shares/${userId}`),
};

// ── Friends ───────────────────────────────────────────────────

export const friendsApi = {
  list: () => api.get<{ data: { friends: User[] } }>('/friends'),
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
