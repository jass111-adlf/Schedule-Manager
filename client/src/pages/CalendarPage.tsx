import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, Event } from '../api';

// ── Helpers ───────────────────────────────────────────────────

const BUILTIN_COLORS: Record<string, string> = {
  work: '#3b82f6', personal: '#a855f7', family: '#22c55e',
  health: '#ef4444', social: '#facc15', other: '#9ca3af',
};

function eventColor(e: Event): string {
  if (e.customType?.color) return e.customType.color;
  return BUILTIN_COLORS[e.eventType] ?? '#9ca3af';
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtMonth(y: number, m: number) {
  return new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function fmtDay(d: Date) {
  return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Event pill ────────────────────────────────────────────────

function EventPill({ event, onClick }: { event: Event; onClick: () => void }) {
  const color = eventColor(event);
  return (
    <button
      onClick={onClick}
      style={{ backgroundColor: color }}
      className={`w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 ${event.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
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
  const firstDow = new Date(year, month, 1).getDay();
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
          const dayEvents = date
            ? events
                .filter(e => sameDay(new Date(e.start), date))
                .sort((a, b) => {
                  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
                  return new Date(a.start).getTime() - new Date(b.start).getTime();
                })
            : [];
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
                  {dayEvents.map(e => (
                    <EventPill key={e.id + e.start} event={e} onClick={() => onEventClick(e.id)} />
                  ))}
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

function DayView({ date, events, onEventClick }: {
  date: Date; events: Event[]; onEventClick: (id: string) => void;
}) {
  const dateStr = date.toDateString();
  const dayEvents = events
    .filter(e => sameDay(new Date(e.start ?? (e as any).startDatetime), date))
    .sort((a, b) => {
      // All-day events at top, then timed events sorted earliest → latest
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.start).getTime() - new Date(b.start).getTime();
    });

  return (
    <div key={dateStr}>
      {dayEvents.length === 0 ? (
        <p className="text-sm text-gray-400 py-6">No events this day.</p>
      ) : (
        <div className="space-y-2">
          {dayEvents.map(e => (
            <button
              key={e.id + e.start}
              onClick={() => onEventClick(e.id)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${e.status === 'cancelled' ? 'opacity-50' : ''}`}
            >
              <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: eventColor(e) }} />
              <div>
                <p className={`text-sm font-medium text-gray-800 ${e.status === 'cancelled' ? 'line-through' : ''}`}>{e.title}</p>
                <p className="text-xs text-gray-500">{e.allDay ? 'All day' : `${fmtTime(e.start)} – ${fmtTime(e.end)}`}</p>
                {e.location && <p className="text-xs text-gray-400">{e.location}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar page ─────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const today = new Date();

  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [view, setView]       = useState<'month' | 'day'>('month');
  const [selected, setSelected] = useState<Date>(today);
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch events for the visible month
  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
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
    const d = new Date(selected); d.setDate(d.getDate() - 1);
    setSelected(d);
    if (d.getMonth() !== month || d.getFullYear() !== year) { setYear(d.getFullYear()); setMonth(d.getMonth()); }
  }
  function nextDay() {
    const d = new Date(selected); d.setDate(d.getDate() + 1);
    setSelected(d);
    if (d.getMonth() !== month || d.getFullYear() !== year) { setYear(d.getFullYear()); setMonth(d.getMonth()); }
  }

  function goToday() {
    setSelected(today); setYear(today.getFullYear()); setMonth(today.getMonth());
    if (view === 'month') setView('month');
  }

  return (
    <Layout>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {view === 'month' ? (
            <>
              <button onClick={prevMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg">‹</button>
              <h1 className="text-lg font-semibold text-gray-800 w-44 text-center">{fmtMonth(year, month)}</h1>
              <button onClick={nextMonth} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg">›</button>
            </>
          ) : (
            <>
              <button onClick={prevDay} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg">‹</button>
              <h1 className="text-base font-semibold text-gray-800 w-64 text-center">{fmtDay(selected)}</h1>
              <button onClick={nextDay} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 text-lg">›</button>
            </>
          )}
          <button onClick={goToday} className="ml-1 text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">Today</button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button onClick={() => setView('month')} className={`px-3 py-1.5 ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Month</button>
            <button
              onClick={() => { setSelected(today); setView('day'); }}
              className={`px-3 py-1.5 ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Day</button>
          </div>
          <button onClick={() => navigate('/events/new')} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-gray-400">Loading events…</div>
      ) : view === 'month' ? (
        <MonthView
          year={year} month={month} events={events}
          onDayClick={d => { setSelected(d); setView('day'); }}
          onEventClick={id => navigate(`/events/${id}`)}
        />
      ) : (
        <DayView date={selected} events={events} onEventClick={id => navigate(`/events/${id}`)} />
      )}
    </Layout>
  );
}
