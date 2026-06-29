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
const TYPE_COLOR = {
    work: 'bg-blue-500', personal: 'bg-purple-500', family: 'bg-green-500',
    health: 'bg-red-500', social: 'bg-yellow-400', other: 'bg-gray-400',
};
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso) {
    return new Date(iso).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}
function EventCard({ event, onClick }) {
    return (_jsxs("button", { onClick: onClick, className: "w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow", children: [_jsx("span", { className: `w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${TYPE_COLOR[event.eventType] ?? 'bg-gray-400'}` }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: event.title }), _jsxs("p", { className: "text-xs text-gray-500", children: [fmtDate(event.start), " \u00B7 ", event.allDay ? 'All day' : fmtTime(event.start)] })] })] }));
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
        return _jsx(Layout, { children: _jsx("div", { className: "text-sm text-gray-400 py-10 text-center", children: "Loading\u2026" }) });
    return (_jsx(Layout, { children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("section", { children: [_jsx("h2", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3", children: "Today" }), data.todayEvents.length === 0
                            ? _jsx("p", { className: "text-sm text-gray-400", children: "Nothing today." })
                            : _jsx("div", { className: "space-y-2", children: sortEvents(data.todayEvents).map(e => _jsx(EventCard, { event: e, onClick: () => navigate(`/events/${e.id}`) }, e.id + e.start)) }), _jsx("button", { onClick: () => navigate('/events/new'), className: "mt-3 text-xs text-blue-600 hover:underline", children: "+ New event" })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3", children: "Next 7 days" }), data.upcomingEvents.length === 0
                            ? _jsx("p", { className: "text-sm text-gray-400", children: "Nothing upcoming." })
                            : _jsx("div", { className: "space-y-2", children: sortEvents(data.upcomingEvents).map(e => _jsx(EventCard, { event: e, onClick: () => navigate(`/events/${e.id}`) }, e.id + e.start)) })] }), _jsxs("section", { children: [_jsx("h2", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3", children: "Invitations" }), data.recentInvitations.length === 0
                            ? _jsx("p", { className: "text-sm text-gray-400", children: "No recent invitations." })
                            : _jsx("div", { className: "space-y-2", children: data.recentInvitations.map(inv => (_jsxs("div", { className: "p-3 bg-white rounded-lg border border-gray-100 shadow-sm", children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: inv.event.title }), _jsxs("p", { className: "text-xs text-gray-500 mb-2", children: ["from ", inv.event.owner.name] }), inv.invitationStatus === 'pending' ? (_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => respond(inv.id, 'accept'), className: "text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700", children: "Accept" }), _jsx("button", { onClick: () => respond(inv.id, 'decline'), className: "text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200", children: "Decline" })] })) : (_jsx("span", { className: `text-xs px-2 py-0.5 rounded-full ${inv.invitationStatus === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`, children: inv.invitationStatus }))] }, inv.id))) })] })] }) }));
}
