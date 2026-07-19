import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi } from '../api';
// ── Helpers (all local-browser time) ─────────────────────────
const BUILTIN_COLORS = {
    work: '#3b82f6', personal: '#a855f7', family: '#22c55e',
    health: '#ef4444', social: '#facc15', other: '#9ca3af',
};
function profileEventColor(e) {
    if (e.customType?.color)
        return e.customType.color;
    return BUILTIN_COLORS[e.eventType] ?? '#9ca3af';
}
function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDt(iso) {
    return new Date(iso).toLocaleString('default', { dateStyle: 'medium', timeStyle: 'short' });
}
function sameDayLocal(isoUtc, year, month, day) {
    const d = new Date(isoUtc);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}
function fmtMonth(y, m) {
    return new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function fmtDay(d) {
    return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
}
function sortProfileEvents(arr) {
    return [...arr].sort((a, b) => {
        if (a.allDay !== b.allDay)
            return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
    });
}
// ── Mini event modal ──────────────────────────────────────────
function EventModal({ event, onClose }) {
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center px-4", onClick: onClose, children: [_jsx("div", { className: "absolute inset-0 bg-black/20" }), _jsxs("div", { className: "relative bg-white rounded-container border border-warm-border p-5 w-full max-w-sm shadow-lg", onClick: e => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsx("h3", { className: "text-base font-bold text-ink pr-4", children: event.title }), _jsx("button", { onClick: onClose, className: "text-ink-muted hover:text-ink text-xl leading-none", children: "\u00D7" })] }), _jsx("p", { className: "text-sm text-ink-muted mb-1", children: event.allDay ? 'All day' : `${fmtTime(event.start)} – ${fmtTime(event.end)}` }), !event.allDay && (_jsx("p", { className: "text-xs text-ink-muted mb-2", children: fmtDt(event.start) })), event.location && (_jsxs("p", { className: "text-xs text-ink-muted mb-1", children: ["\uD83D\uDCCD ", event.location] })), event.description && (_jsx("p", { className: "text-xs text-ink mt-2 whitespace-pre-wrap line-clamp-4", children: event.description })), _jsx("div", { className: "mt-3", children: _jsx("span", { className: "text-xs px-2 py-0.5 rounded-pill bg-coral-tint text-coral-dark capitalize", children: event.visibility }) })] })] }));
}
// ── Month view ────────────────────────────────────────────────
function ProfileMonthView({ year, month, events, onDayClick, onEventClick }) {
    const today = new Date();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) => i < firstDow ? null : i - firstDow + 1);
    return (_jsxs("div", { children: [_jsx("div", { className: "grid grid-cols-7 text-xs font-medium text-ink-muted mb-1", children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (_jsx("div", { className: "text-center py-1", children: d }, d))) }), _jsx("div", { className: "grid grid-cols-7 border-l border-t border-warm-border", children: cells.map((day, i) => {
                    const dayEvents = day
                        ? sortProfileEvents(events.filter(e => sameDayLocal(e.start, year, month, day)))
                        : [];
                    const isToday = day
                        ? today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
                        : false;
                    return (_jsx("div", { onClick: () => day && onDayClick(new Date(year, month, day)), className: `min-h-20 border-b border-r border-warm-border p-1 cursor-pointer hover:bg-coral-tint transition-colors ${!day ? 'bg-warm-card cursor-default' : ''}`, children: day && (_jsxs(_Fragment, { children: [_jsx("span", { className: `text-xs inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-coral text-white font-semibold' : 'text-ink'}`, children: day }), dayEvents.map((e, idx) => {
                                    if (!e.visible) {
                                        return (_jsx("div", { className: "w-full text-xs text-ink-muted px-1.5 py-0.5 rounded bg-warm-border truncate mb-0.5 italic", children: "Busy" }, e.id + idx));
                                    }
                                    return (_jsx("button", { onClick: ev => { ev.stopPropagation(); onEventClick(e); }, style: { backgroundColor: profileEventColor(e) }, className: `w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 hover:opacity-80 transition-opacity ${e.status === 'cancelled' ? 'opacity-40 line-through' : ''}`, children: e.allDay ? e.title : `${fmtTime(e.start)} ${e.title}` }, e.id + idx));
                                })] })) }, i));
                }) })] }));
}
// ── Day view ──────────────────────────────────────────────────
function ProfileDayView({ date, events, onEventClick }) {
    const { year, month, day } = { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
    const dayEvents = sortProfileEvents(events.filter(e => sameDayLocal(e.start, year, month, day)));
    if (dayEvents.length === 0) {
        return _jsx("p", { className: "text-sm text-ink-muted py-6", children: "No visible events this day." });
    }
    return (_jsx("div", { className: "space-y-2", children: dayEvents.map((e, idx) => {
            if (!e.visible) {
                return (_jsxs("div", { className: "flex items-center gap-3 p-3 rounded-card bg-warm-card border border-warm-border", children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full bg-warm-border flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-ink-muted italic", children: "Busy" }), _jsx("p", { className: "text-xs text-ink-muted", children: e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}` })] }), _jsx("span", { className: "ml-auto text-ink-muted text-sm", children: "\uD83D\uDD12" })] }, e.id + idx));
            }
            const color = profileEventColor(e);
            return (_jsxs("button", { onClick: () => onEventClick(e), className: `w-full text-left flex items-start gap-3 p-3 rounded-card bg-white border border-warm-border hover:bg-coral-tint transition-colors ${e.status === 'cancelled' ? 'opacity-50' : ''}`, children: [_jsx("span", { className: "w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0", style: { backgroundColor: color } }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: `text-sm font-medium text-ink ${e.status === 'cancelled' ? 'line-through' : ''}`, children: e.title }), _jsx("p", { className: "text-xs text-ink-muted", children: e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}` }), e.location && _jsx("p", { className: "text-xs text-ink-muted truncate", children: e.location }), e.description && _jsx("p", { className: "text-xs text-ink-muted mt-1 line-clamp-2", children: e.description })] }), _jsx("span", { className: "text-xs text-ink-muted flex-shrink-0 capitalize", children: e.visibility })] }, e.id + idx));
        }) }));
}
// ── User calendar page ────────────────────────────────────────
export default function UserCalendarPage() {
    const { userId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const today = new Date();
    const userName = location.state?.name ?? 'User';
    const [year, setYear] = useState(today.getFullYear());
    const [month, setMonth] = useState(today.getMonth());
    const [view, setView] = useState('month');
    const [selected, setSelected] = useState(today);
    const [events, setEvents] = useState([]);
    const [isFriend, setIsFriend] = useState(false);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    useEffect(() => {
        if (!userId)
            return;
        const start = new Date(year, month, 1).toISOString();
        const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
        setLoading(true);
        usersApi.getProfile(userId, start, end)
            .then(r => {
            setEvents(r.data.data.events);
            setIsFriend(r.data.data.isFriend);
        })
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
    return (_jsxs(Layout, { children: [selectedEvent && (_jsx(EventModal, { event: selectedEvent, onClose: () => setSelectedEvent(null) })), _jsxs("div", { className: "flex items-center gap-3 mb-4 flex-wrap", children: [_jsx("button", { onClick: () => navigate('/people'), className: "text-sm text-ink-muted hover:text-ink transition-colors", children: "\u2190 Back" }), _jsxs("h1", { className: "text-xl font-bold text-ink", children: [userName, "'s Calendar"] }), _jsx("span", { className: "text-xs px-2 py-0.5 rounded-pill bg-coral-tint text-coral-dark", children: isFriend ? 'Friend view' : 'Public view' })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-4", children: [_jsx("div", { className: "flex items-center gap-2", children: view === 'month' ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevMonth, className: "p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors", children: "\u2039" }), _jsx("h2", { className: "text-lg font-bold text-ink w-44 text-center", children: fmtMonth(year, month) }), _jsx("button", { onClick: nextMonth, className: "p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors", children: "\u203A" })] })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: prevDay, className: "p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors", children: "\u2039" }), _jsx("h2", { className: "text-lg font-bold text-ink w-64 text-center", children: fmtDay(selected) }), _jsx("button", { onClick: nextDay, className: "p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors", children: "\u203A" })] })) }), _jsxs("div", { className: "flex rounded-pill border border-warm-border overflow-hidden text-sm", children: [_jsx("button", { onClick: () => setView('month'), className: `px-3 py-1.5 transition-colors ${view === 'month' ? 'bg-coral text-white' : 'bg-white text-ink-muted hover:bg-warm-card'}`, children: "Month" }), _jsx("button", { onClick: () => { setSelected(today); setView('day'); }, className: `px-3 py-1.5 transition-colors ${view === 'day' ? 'bg-coral text-white' : 'bg-white text-ink-muted hover:bg-warm-card'}`, children: "Day" })] })] }), _jsxs("div", { className: "flex items-center gap-4 mb-4 text-xs text-ink-muted", children: [_jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-3 rounded inline-block", style: { backgroundColor: '#a855f7' } }), " Visible event"] }), _jsxs("span", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "w-3 h-3 rounded bg-warm-border inline-block" }), " Private / restricted"] })] }), loading ? (_jsx("div", { className: "text-center py-20 text-sm text-ink-muted", children: "Loading calendar\u2026" })) : view === 'month' ? (_jsx(ProfileMonthView, { year: year, month: month, events: events, onDayClick: d => { setSelected(d); setView('day'); }, onEventClick: setSelectedEvent })) : (_jsx(ProfileDayView, { date: selected, events: events, onEventClick: setSelectedEvent }))] }));
}
