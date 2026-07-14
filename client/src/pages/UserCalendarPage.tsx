import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi, ProfileEvent } from '../api';

// ── Timezone-aware helpers ─────────────────────────────────────

const BUILTIN_COLORS: Record<string, string> = {
  work: '#3b82f6', personal: '#a855f7', family: '#22c55e',
  health: '#ef4444', social: '#facc15', other: '#9ca3af',
};

function profileEventColor(e: Extract<ProfileEvent, { visible: true }>): string {
  if (e.customType?.color) return e.customType.color;
  return BUILTIN_COLORS[e.eventType] ?? '#9ca3af';
}

// Format time in a specific IANA timezone
function fmtTimeInTz(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: tz });
}

// Check if a UTC instant falls on a given calendar date in a given timezone
function sameDayInTz(isoUtc: string, year: number, month: number, day: number, tz: string): boolean {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(isoUtc)); // "YYYY-MM-DD"
  const [y, m, d] = s.split('-').map(Number);
  return y === year && m - 1 === month && d === day;
}

function fmtMonth(y: number, m: number) {
  return new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
}
function fmtDay(d: Date) {
  return d.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' });
}

function sortProfileEvents(arr: ProfileEvent[]): ProfileEvent[] {
  return [...arr].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

// ── Month view ────────────────────────────────────────────────

function ProfileMonthView({ year, month, events, ownerTz, onDayClick }: {
  year: number; month: number; events: ProfileEvent[]; ownerTz: string;
  onDayClick: (d: Date) => void;
}) {
  const today = new Date();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: ownerTz }).format(today);
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDow + daysInMonth }, (_, i) =>
    i < firstDow ? null : i - firstDow + 1
  );

  return (
    <div>
      <div className="grid grid-cols-7 text-xs font-medium text-ink-muted mb-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
          <div key={d} className="text-center py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l border-t border-warm-border">
        {cells.map((day, i) => {
          const dayEvents = day
            ? sortProfileEvents(events.filter(e => sameDayInTz(e.start, year, month, day, ownerTz)))
            : [];
          const dayStr = day ? `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
          const isToday = dayStr === todayStr;
          return (
            <div
              key={i}
              onClick={() => day && onDayClick(new Date(year, month, day))}
              className={`min-h-20 border-b border-r border-warm-border p-1 cursor-pointer hover:bg-coral-tint transition-colors ${!day ? 'bg-warm-card cursor-default' : ''}`}
            >
              {day && (
                <>
                  <span className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full mb-1 ${isToday ? 'bg-coral text-white font-semibold' : 'text-ink'}`}>
                    {day}
                  </span>
                  {dayEvents.map((e, idx) => {
                    if (!e.visible) {
                      return (
                        <div key={e.id + idx} className="w-full text-xs text-ink-muted px-1.5 py-0.5 rounded bg-warm-border truncate mb-0.5 italic">
                          Busy
                        </div>
                      );
                    }
                    return (
                      <div
                        key={e.id + idx}
                        style={{ backgroundColor: profileEventColor(e) }}
                        className={`w-full text-left text-xs text-white px-1.5 py-0.5 rounded truncate mb-0.5 ${e.status === 'cancelled' ? 'opacity-40 line-through' : ''}`}
                      >
                        {e.allDay ? e.title : `${fmtTimeInTz(e.start, ownerTz)} ${e.title}`}
                      </div>
                    );
                  })}
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

function ProfileDayView({ date, events, ownerTz }: { date: Date; events: ProfileEvent[]; ownerTz: string }) {
  const { year, month, day } = { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
  const dayEvents = sortProfileEvents(events.filter(e => sameDayInTz(e.start, year, month, day, ownerTz)));

  if (dayEvents.length === 0) {
    return <p className="text-sm text-ink-muted py-6">No visible events this day.</p>;
  }

  return (
    <div className="space-y-2">
      {dayEvents.map((e, idx) => {
        if (!e.visible) {
          return (
            <div key={e.id + idx} className="flex items-center gap-3 p-3 rounded-card bg-warm-card border border-warm-border">
              <span className="w-2.5 h-2.5 rounded-full bg-warm-border flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-ink-muted italic">Busy</p>
                <p className="text-xs text-ink-muted">
                  {e.allDay ? 'All day' : `${fmtTimeInTz(e.start, ownerTz)} – ${fmtTimeInTz(e.end, ownerTz)}`}
                </p>
              </div>
              <span className="ml-auto text-ink-muted text-sm">🔒</span>
            </div>
          );
        }

        const color = profileEventColor(e);
        return (
          <div
            key={e.id + idx}
            className={`flex items-start gap-3 p-3 rounded-card bg-white border border-warm-border hover:bg-coral-tint transition-colors ${e.status === 'cancelled' ? 'opacity-50' : ''}`}
          >
            <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium text-ink ${e.status === 'cancelled' ? 'line-through' : ''}`}>
                {e.title}
              </p>
              <p className="text-xs text-ink-muted">
                {e.allDay ? 'All day' : `${fmtTimeInTz(e.start, ownerTz)} – ${fmtTimeInTz(e.end, ownerTz)}`}
              </p>
              {e.location && <p className="text-xs text-ink-muted truncate">{e.location}</p>}
              {e.description && <p className="text-xs text-ink-muted mt-1 line-clamp-2">{e.description}</p>}
            </div>
            <span className="text-xs text-ink-muted flex-shrink-0 capitalize">{e.visibility}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── User calendar page ────────────────────────────────────────

export default function UserCalendarPage() {
  const { userId } = useParams<{ userId: string }>();
  const location   = useLocation();
  const navigate   = useNavigate();
  const today      = new Date();

  const userName: string = (location.state as any)?.name ?? 'User';

  const [year, setYear]         = useState(today.getFullYear());
  const [month, setMonth]       = useState(today.getMonth());
  const [view, setView]         = useState<'month' | 'day'>('month');
  const [selected, setSelected] = useState<Date>(today);
  const [events, setEvents]     = useState<ProfileEvent[]>([]);
  const [isFriend, setIsFriend] = useState(false);
  const [ownerTz, setOwnerTz]   = useState('UTC');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!userId) return;
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    setLoading(true);
    usersApi.getProfile(userId, start, end)
      .then(r => {
        setEvents(r.data.data.events);
        setIsFriend(r.data.data.isFriend);
        setOwnerTz(r.data.data.ownerTimezone);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, year, month]);

  function prevMonth() { month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1); }
  function nextMonth() { month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1); }
  function prevDay() {
    const d = new Date(selected); d.setDate(d.getDate() - 1); setSelected(d);
    if (d.getMonth() !== month || d.getFullYear() !== year) { setYear(d.getFullYear()); setMonth(d.getMonth()); }
  }
  function nextDay() {
    const d = new Date(selected); d.setDate(d.getDate() + 1); setSelected(d);
    if (d.getMonth() !== month || d.getFullYear() !== year) { setYear(d.getFullYear()); setMonth(d.getMonth()); }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button onClick={() => navigate('/people')} className="text-sm text-ink-muted hover:text-ink transition-colors">← Back</button>
        <h1 className="text-lg font-semibold text-ink">{userName}'s Calendar</h1>
        <span className="text-xs px-2 py-0.5 rounded-pill bg-coral-tint text-coral-dark">
          {isFriend ? 'Friend view' : 'Public view'}
        </span>
        {ownerTz !== 'UTC' && (
          <span className="text-xs px-2 py-0.5 rounded-pill bg-warm-card text-ink-muted border border-warm-border">
            {ownerTz}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {view === 'month' ? (
            <>
              <button onClick={prevMonth} className="p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors">‹</button>
              <h2 className="text-base font-semibold text-ink w-44 text-center">{fmtMonth(year, month)}</h2>
              <button onClick={nextMonth} className="p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors">›</button>
            </>
          ) : (
            <>
              <button onClick={prevDay} className="p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors">‹</button>
              <h2 className="text-base font-semibold text-ink w-64 text-center">{fmtDay(selected)}</h2>
              <button onClick={nextDay} className="p-1.5 rounded-card hover:bg-warm-card text-ink-muted text-lg transition-colors">›</button>
            </>
          )}
        </div>
        <div className="flex rounded-pill border border-warm-border overflow-hidden text-sm">
          <button onClick={() => setView('month')} className={`px-3 py-1.5 transition-colors ${view === 'month' ? 'bg-coral text-white' : 'bg-white text-ink-muted hover:bg-warm-card'}`}>Month</button>
          <button onClick={() => { setSelected(today); setView('day'); }} className={`px-3 py-1.5 transition-colors ${view === 'day' ? 'bg-coral text-white' : 'bg-white text-ink-muted hover:bg-warm-card'}`}>Day</button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ backgroundColor: '#a855f7' }} /> Visible event</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-warm-border inline-block" /> Private / restricted</span>
      </div>

      {loading ? (
        <div className="text-center py-20 text-sm text-ink-muted">Loading calendar…</div>
      ) : view === 'month' ? (
        <ProfileMonthView year={year} month={month} events={events} ownerTz={ownerTz} onDayClick={d => { setSelected(d); setView('day'); }} />
      ) : (
        <ProfileDayView date={selected} events={events} ownerTz={ownerTz} />
      )}
    </Layout>
  );
}
