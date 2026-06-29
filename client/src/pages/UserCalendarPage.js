import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi } from '../api';
// ── Helpers ───────────────────────────────────────────────────
const BUILTIN_COLORS = {
    work: '#3b82f6', personal: '#a855f7', family: '#22c55e',
    health: '#ef4444', social: '#facc15', other: '#9ca3af',
};
function profileEventColor(e) {
    if (e.customType?.color)
        return e.customType.color;
    return BUILTIN_COLORS[e.eventType] ?? '#9ca3af';
}
function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtMonth(y, m) {
    return new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function fmtDay(d) {
    return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
}
// Sort: all-day events at top, then timed events earliest → latest
function sortProfileEvents(arr) {
    return [...arr].sort((a, b) => {
        if (a.allDay !== b.allDay)
            return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
}
// ── Month view ────────────────────────────────────────────────
function ProfileMonthView({ year, month, events, onDayClick }) {
    const today = new Date();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) => i < firstDow ? null : new Date(year, month, i - firstDow + 1));
    return (_jsxs("div", { children: [_jsx("div", { className: "grid grid-cols-7 text-xs font-medium text-gray-500 mb-1", children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (_jsx("div", { className: "text-center py-1", children: d }, d))) }), _jsx("div", { className: "grid grid-cols-7 border-l border-t border-gray-200", children: cells.map((date, i) => {
                    const dayEvents = date
                        ? sortProfileEvents(events.filter(e => sameDay(new Date(e.start), date)))
                        : [];
                    const isToday = date ? sameDay(date, today) : false;
                    return (_jsx("div", { onClick: () => date && onDayClick(date), className: `min-h-20 border-b border-r border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${!date ? 'bg-gray-50 cursor-default' : ''}`, children: date && (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-xs inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700'}`, children: date.getDate() }), dayEvents.map((e, idx) => {
                                    if (!e.visible) {
                                        return (_jsx("div", { className: "w-full text-xs text-gray-400 px-1.5 py-0.5 rounded bg-gray-200 truncate mb-0.5 italic", children: "Busy" }, e.id + idx));
                                    }
                                    return (_jsx("div", { style: { backgroundColor: profileEventColor(e) }, className: `w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 ${e.status === 'cancelled' ? 'opacity-40 line-through' : ''}`, children: e.allDay ? e.title : `${fmtTime(e.start)} ${e.title}` }, e.id + idx));
                                })] })) }, i));
                }) })] }));
}
// ── Day view ──────────────────────────────────────────────────
function ProfileDayView({ date, events }) {
    const dayEvents = sortProfileEvents(events.filter(e => sameDay(new Date(e.start), date)));
    if (dayEvents.length === 0) {
        return _jsx("p", { className: "text-sm text-gray-400 py-6", children: "No visible events this day." });
    }
    return (_jsx("div", { className: "space-y-2", children: dayEvents.map((e, idx) => {
            if (!e.visible) {
                return (_jsxs("div", { className: "flex items-center gap-3 p-3 rounded-lg bg-gray-100 border border-gray-200", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-gray-400 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-400 italic", children: "Busy" }), _jsx("p", { className: "text-xs text-gray-400", children: e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}` })] }), _jsx("span", { className: "ml-auto text-gray-300 text-lg", children: "\uD83D\uDD12" })] }, e.id + idx));
            }
            const color = profileEventColor(e);
            return (_jsxs("div", { className: `flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 ${e.status === 'cancelled' ? 'opacity-50' : ''}`, children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", style: { backgroundColor: color } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `text-sm font-medium text-gray-800 ${e.status === 'cancelled' ? 'line-through' : ''}`, children: e.title }), _jsx("p", { className: "text-xs text-gray-500", children: e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}` }), e.location && _jsx("p", { className: "text-xs text-gray-400 truncate", children: e.location }), e.description && _jsx("p", { className: "text-xs text-gray-500 mt-1 line-clamp-2", children: e.description })] }), _jsx("span", { className: "text-xs text-gray-300 flex-shrink-0 capitalize", children: e.visibility })] }, e.id + idx));
        }) }));
}
// ── User calendar page ────────────────────────────────────────
export default function UserCalendarPage() {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const today = new Date();
    // Name comes from navigation state (set by PeoplePage)
    const userName = location.state?.name ?? 'User';
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [view, setView] = useState('month');
    const [selected, setSelected] = useState(today);
    const [events, setEvents] = useState([]);
    const [isFriend, setIsFriend] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!userId)
            return;
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        setLoading(true);
        usersApi.getProfile(userId, start, end)
            .then(r => { setEvents(r.data.data.events); setIsFriend(r.data.data.isFriend); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userId, year, month]);
    function prevMonth() { month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1); }
    function nextMonth() { month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1); }
    function prevDay() {
        const d = new Date(selected);
        d.setDate(d.getDate() - 1);
        setSelected(d);
        if (d.getMonth() !== month || d.getFullYear() !== year) {
            setYear(d.getFullYear());
            setMonth(d.getMonth());
        }
    }
    function nextDay() {
        const d = new Date(selected);
        d.setDate(d.getDate() + 1);
        setSelected(d);
        if (d.getMonth() !== month || d.getFullYear() !== year) {
            setYear(d.getFullYear());
            setMonth(d.getMonth());
        }
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("button", { onClick: () => navigate('/people'), className: "text-sm text-gray-500 hover:text-gray-800", children: "\u2190 Back" }), _jsxs("h1", { className: "text-lg font-semibold text-gray-800", children: [userName, "'s Calendar"] }), _jsx("span", { className: "text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700", children: isFriend ? 'Friend view' : 'Public view' })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-4", children: [_jsx("div", { className: "flex items-center gap-2", children: view === 'month' ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevMonth, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u2039" }), _jsx("h2", { className: "text-base font-semibold text-gray-800 w-44 text-center", children: fmtMonth(year, month) }), _jsx("button", { onClick: nextMonth, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u203A" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevDay, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u2039" }), _jsx("h2", { className: "text-base font-semibold text-gray-800 w-64 text-center", children: fmtDay(selected) }), _jsx("button", { onClick: nextDay, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u203A" })] })) }), _jsxs("div", { className: "flex rounded-lg border border-gray-200 overflow-hidden text-sm", children: [_jsx("button", { onClick: () => setView('month'), className: `px-3 py-1.5 ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`, children: "Month" }), _jsx("button", { onClick: () => { setSelected(today); setView('day'); }, className: `px-3 py-1.5 ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`, children: "Day" })] })] }), _jsxs("div", { className: "flex items-center gap-4 mb-4 text-xs text-gray-500", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-3 rounded bg-blue-500 inline-block" }), " Visible event"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-3 rounded bg-gray-300 inline-block" }), " Private / restricted"] })] }), loading ? (_jsx("div", { className: "text-center py-20 text-sm text-gray-400", children: "Loading calendar\u2026" })) : view === 'month' ? (_jsx(ProfileMonthView, { year: year, month: month, events: events, onDayClick: d => { setSelected(d); setView('day'); } })) : (_jsx(ProfileDayView, { date: selected, events: events }))] }));
}
