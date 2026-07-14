import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboardApi, invitationsApi } from '../api';
function sortEvents(events) {
    return [...events].sort((a, b) => {
        if (a.allDay !== b.allDay)
            return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}
function EventCard({ event, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: "w-full text-left flex items-start gap-3 p-3 rounded-card bg-warm-card hover:bg-coral-tint transition-colors", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 bg-coral" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-ink", children: event.title }), _jsxs("p", { className: "text-xs text-ink-muted mt-0.5", children: [fmtDate(event.start), " \u00B7 ", event.allDay ? 'All day' : fmtTime(event.start)] })] })] }));
}
export default function DashboardPage() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const load = () => dashboardApi.get().then(r => setData(r.data.data)).catch(console.error);
    useEffect(() => { load(); }, []);
    async function respond(id, action) {
        try {
            action === 'accept' ? await invitationsApi.accept(id) : await invitationsApi.decline(id);
            load();
        }
        catch (err) {
            console.error(err);
        }
    }
    if (!data)
        return _jsx(Layout, { children: _jsx("div", { className: "text-sm text-ink-muted py-10 text-center", children: "Loading\u2026" }) });
    return (_jsx(Layout, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("section", { children: [_jsx("h2", { className: "text-[13px] font-semibold text-coral-dark mb-3", children: "Today" }), data.todayEvents.length === 0
                            ? _jsx("p", { className: "text-sm text-ink-muted", children: "Nothing today." })
                            : _jsx("div", { className: "space-y-2", children: sortEvents(data.todayEvents).map(e => _jsx(EventCard, { event: e, onClick: () => navigate(`/events/${e.id}`) }, e.id + e.start)) }), _jsx("button", { onClick: () => navigate('/events/new'), className: "mt-3 text-xs text-coral-dark hover:text-coral font-medium", children: "+ New event" })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-[13px] font-semibold text-coral-dark mb-3", children: "Next 7 days" }), data.upcomingEvents.length === 0
                            ? _jsx("p", { className: "text-sm text-ink-muted", children: "Nothing upcoming." })
                            : _jsx("div", { className: "space-y-2", children: sortEvents(data.upcomingEvents).map(e => _jsx(EventCard, { event: e, onClick: () => navigate(`/events/${e.id}`) }, e.id + e.start)) })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-[13px] font-semibold text-coral-dark mb-3", children: "Invitations" }), data.recentInvitations.length === 0
                            ? _jsx("p", { className: "text-sm text-ink-muted", children: "No recent invitations." })
                            : _jsx("div", { className: "space-y-2", children: data.recentInvitations.map(inv => (_jsxs("div", { className: "p-3 bg-warm-card rounded-card", children: [_jsx("p", { className: "text-sm font-medium text-ink", children: inv.event.title }), _jsxs("p", { className: "text-xs text-ink-muted mb-2", children: ["from ", inv.event.owner.name] }), inv.invitationStatus === 'pending' ? (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => respond(inv.id, 'accept'), className: "text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors", children: "Accept" }), _jsx("button", { onClick: () => respond(inv.id, 'decline'), className: "text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "Decline" })] })) : (_jsx("span", { className: `text-xs px-2 py-0.5 rounded-pill ${inv.invitationStatus === 'accepted' ? 'bg-coral-tint text-coral-dark' : 'bg-warm-border text-ink-muted'}`, children: inv.invitationStatus }))] }, inv.id))) })] })] }) }));
}
