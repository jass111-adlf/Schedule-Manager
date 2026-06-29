import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi } from '../api';
// ── Helpers ───────────────────────────────────────────────────
const BUILTIN_COLORS = {
    work: '#3b82f6', personal: '#a855f7', family: '#22c55e',
    health: '#ef4444', social: '#facc15', other: '#9ca3af',
};
function eventColor(e) {
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
// ── Event pill ────────────────────────────────────────────────
function EventPill({ event, onClick }) {
    const color = eventColor(event);
    return (_jsx("button", { onClick: onClick, style: { backgroundColor: color }, className: `w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 ${event.status === 'cancelled' ? 'opacity-40 line-through' : ''}`, children: event.title }));
}
// ── Month view ────────────────────────────────────────────────
function MonthView({ year, month, events, onDayClick, onEventClick }) {
    const today = new Date();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) => i < firstDow ? null : new Date(year, month, i - firstDow + 1));
    return (_jsxs("div", { children: [_jsx("div", { className: "grid grid-cols-7 text-xs font-medium text-gray-500 mb-1", children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (_jsx("div", { className: "text-center py-1", children: d }, d))) }), _jsx("div", { className: "grid grid-cols-7 border-l border-t border-gray-200", children: cells.map((date, i) => {
                    const dayEvents = date
                        ? events
                            .filter(e => sameDay(new Date(e.start), date))
                            .sort((a, b) => {
                            if (a.allDay !== b.allDay)
                                return a.allDay ? -1 : 1;
                            return new Date(a.start).getTime() - new Date(b.start).getTime();
                        })
                        : [];
                    const isToday = date ? sameDay(date, today) : false;
                    return (_jsx("div", { onClick: () => date && onDayClick(date), className: `min-h-20 border-b border-r border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${!date ? 'bg-gray-50 cursor-default' : ''}`, children: date && (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-xs inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700'}`, children: date.getDate() }), dayEvents.map(e => (_jsx(EventPill, { event: e, onClick: () => onEventClick(e.id) }, e.id + e.start)))] })) }, i));
                }) })] }));
}
// ── Day view ──────────────────────────────────────────────────
function DayView({ date, events, onEventClick }) {
    const dateStr = date.toDateString();
    const dayEvents = events
        .filter(e => sameDay(new Date(e.start ?? e.startDatetime), date))
        .sort((a, b) => {
        // All-day events at top, then timed events sorted earliest → latest
        if (a.allDay !== b.allDay)
            return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
    return (_jsx("div", { children: dayEvents.length === 0 ? (_jsx("p", { className: "text-sm text-gray-400 py-6", children: "No events this day." })) : (_jsx("div", { className: "space-y-2", children: dayEvents.map(e => (_jsxs("button", { onClick: () => onEventClick(e.id), className: `w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${e.status === 'cancelled' ? 'opacity-50' : ''}`, children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", style: { backgroundColor: eventColor(e) } }), _jsxs("div", { children: [_jsx("p", { className: `text-sm font-medium text-gray-800 ${e.status === 'cancelled' ? 'line-through' : ''}`, children: e.title }), _jsx("p", { className: "text-xs text-gray-500", children: e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}` }), e.location && _jsx("p", { className: "text-xs text-gray-400", children: e.location })] })] }, e.id + e.start))) })) }, dateStr));
}
// ── Calendar page ─────────────────────────────────────────────
export default function CalendarPage() {
    const navigate = useNavigate();
    const today = new Date();
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [view, setView] = useState('month');
    const [selected, setSelected] = useState(today);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    // Fetch events for the visible month
    useEffect(() => {
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        setLoading(true);
        eventsApi.list(start, end)
            .then(r => setEvents(r.data.data.events))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [year, month]);
    // Month navigation
    function prevMonth() { month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1); }
    function nextMonth() { month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1); }
    // Day navigation (updates month/year if crossing a boundary)
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
    function goToday() {
        setSelected(today);
        setYear(today.getFullYear());
        setMonth(today.getMonth());
        if (view === 'month')
            setView('month');
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [view === 'month' ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevMonth, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u2039" }), _jsx("h1", { className: "text-lg font-semibold text-gray-800 w-44 text-center", children: fmtMonth(year, month) }), _jsx("button", { onClick: nextMonth, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u203A" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevDay, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u2039" }), _jsx("h1", { className: "text-base font-semibold text-gray-800 w-64 text-center", children: fmtDay(selected) }), _jsx("button", { onClick: nextDay, className: "p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg", children: "\u203A" })] })), _jsx("button", { onClick: goToday, className: "ml-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600", children: "Today" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "flex rounded-lg border border-gray-200 overflow-hidden text-sm", children: [_jsx("button", { onClick: () => setView('month'), className: `px-3 py-1.5 ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`, children: "Month" }), _jsx("button", { onClick: () => { setSelected(today); setView('day'); }, className: `px-3 py-1.5 ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`, children: "Day" })] }), _jsx("button", { onClick: () => navigate('/events/new'), className: "text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "+ New" })] })] }), loading ? (_jsx("div", { className: "text-center py-20 text-sm text-gray-400", children: "Loading events\u2026" })) : view === 'month' ? (_jsx(MonthView, { year: year, month: month, events: events, onDayClick: d => { setSelected(d); setView('day'); }, onEventClick: id => navigate(`/events/${id}`) })) : (_jsx(DayView, { date: selected, events: events, onEventClick: id => navigate(`/events/${id}`) }))] }));
}
