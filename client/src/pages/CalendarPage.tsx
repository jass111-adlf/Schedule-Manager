import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, Event } from '../api';

// ── Helpers ───────────────────────────────────────────────────

const TYPE_COLOR: Record<string, string> = {
  work: 'bg-blue-500', personal: 'bg-purple-500', family: 'bg-green-500',
  health: 'bg-red-500', social: 'bg-yellow-400', other: 'bg-gray-400',
};

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtMonth(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}

// ── Event pill ────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: Event; onClick: () => void }) {
  const color = TYPE_COLOR[event.eventType] ?? 'bg-gray-400';
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 ${color} ${event.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
    >
      {event.title}
    </button>
  );
}

// ── Month view ────────────────────────────────────────────────

function MonthView({ year, month, events, onDayClick, onEventClick }: {
  year: number; month: number; events: Event[];
  onDayClick: (d: Date) => void; onEventClick: (id: string) => void;
}) {
  const today = new Date();
  const firstDow = new Date(year, month, 1).getDay();          // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
    i < firstDow ? null : new Date(year, month, i - firstDow + 1)
  );

  return (
    <div>
      <div className="grid grid-cols-7 text-xs font-medium text-gray-500 mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-t border-gray-200">
        {cells.map((date, i) => {
          const dayEvents = date ? events.filter(e => sameDay(new Date(e.start), date)) : [];
          const isToday = date ? sameDay(date, today) : false;
          return (
            <div
              key={i}
              onClick={() => date && onDayClick(date)}
              className={`min-h-20 border-b border-r border-gray-200 p-1 cursor-pointer hover:bg-gray-50 ${!date ? 'bg-gray-50 cursor-default' : ''}`}
            >
              {date && (
                <>
                  <span className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-gray-700'}`}>
                    {date.getDate()}
                  </span>
                  {dayEvents.map(e => <EventPill key={e.id + e.start} event={e} onClick={ev => { ev.stopPropagation(); onEventClick(e.id); }} />)}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day view ──────────────────────────────────────────────────

function DayView({ date, events, onEventClick }: { date: Date; events: Event[]; onEventClick: (id: string) => void }) {
  const dayEvents = events
    .filter(e => sameDay(new Date(e.start), date))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-700 mb-4">
        {date.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
      </h2>
      {dayEvents.length === 0 ? (
        <p className="text-sm text-gray-400">No events this day.</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map(e => {
            const color = TYPE_COLOR[e.eventType] ?? 'bg-gray-400';
            return (
              <button
                key={e.id + e.start}
                onClick={() => onEventClick(e.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${e.status === 'cancelled' ? 'opacity-50' : ''}`}
              >
                <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${color}`} />
                <div>
                  <p className={`text-sm font-medium text-gray-800 ${e.status === 'cancelled' ? 'line-through' : ''}`}>{e.title}</p>
                  <p className="text-xs text-gray-500">{e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}`}</p>
                  {e.location && <p className="text-xs text-gray-400">{e.location}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Calendar page ─────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [view, setView]     = useState<'month' | 'day'>('month');
  const [selected, setSelected] = useState<Date>(today);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);
    eventsApi.list(start, end)
      .then(r => setEvents(r.data.data.events))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  function prevMonth() { month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1); }

  function handleDayClick(date: Date) { setSelected(date); setView('day'); }
  function handleEventClick(id: string) { navigate(`/events/${id}`); }

  return (
    <Layout>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">‹</button>
          <h1 className="text-lg font-semibold text-gray-800 w-44 text-center">{fmtMonth(year, month)}</h1>
          <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setView('month'); }} className="ml-2 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">Today</button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Month</button>
            <button onClick={() => setView('day')}   className={`px-3 py-1.5 ${view === 'day'   ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Day</button>
          </div>
          <button onClick={() => navigate('/events/new')} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Loading events…</div>
      ) : view === 'month' ? (
        <MonthView year={year} month={month} events={events} onDayClick={handleDayClick} onEventClick={handleEventClick} />
      ) : (
        <DayView date={selected} events={events} onEventClick={handleEventClick} />
      )}
    </Layout>
  );
}
