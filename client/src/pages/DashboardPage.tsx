import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { dashboardApi, invitationsApi, Event, Invitation } from '../api';

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return new Date(a.start).getTime() - new Date(b.start).getTime();
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 p-3 rounded-card bg-warm-card hover:bg-coral-tint transition-colors"
    >
      <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 bg-coral" />
      <div>
        <p className="text-sm font-medium text-ink">{event.title}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {fmtDate(event.start)} · {event.allDay ? 'All day' : fmtTime(event.start)}
        </p>
      </div>
    </button>
  );
}

type DashData = { todayEvents: Event[]; upcomingEvents: Event[]; recentInvitations: Invitation[] };

export default function DashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashData | null>(null);

  const load = () => dashboardApi.get().then(r => setData(r.data.data)).catch(console.error);
  useEffect(() => { load(); }, []);

  async function respond(id: string, action: 'accept' | 'decline') {
    try {
      action === 'accept' ? await invitationsApi.accept(id) : await invitationsApi.decline(id);
      load();
    } catch (err) { console.error(err); }
  }

  if (!data) return <Layout><div className="text-sm text-ink-muted py-10 text-center">Loading…</div></Layout>;

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <section>
          <h2 className="text-[13px] font-semibold text-coral-dark mb-3">Today</h2>
          {data.todayEvents.length === 0
            ? <p className="text-sm text-ink-muted">Nothing today.</p>
            : <div className="space-y-2">{sortEvents(data.todayEvents).map(e => <EventCard key={e.id + e.start} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}</div>
          }
          <button
            onClick={() => navigate('/events/new')}
            className="mt-3 text-xs text-coral-dark hover:text-coral font-medium"
          >
            + New event
          </button>
        </section>

        <section>
          <h2 className="text-[13px] font-semibold text-coral-dark mb-3">Next 7 days</h2>
          {data.upcomingEvents.length === 0
            ? <p className="text-sm text-ink-muted">Nothing upcoming.</p>
            : <div className="space-y-2">{sortEvents(data.upcomingEvents).map(e => <EventCard key={e.id + e.start} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}</div>
          }
        </section>

        <section>
          <h2 className="text-[13px] font-semibold text-coral-dark mb-3">Invitations</h2>
          {data.recentInvitations.length === 0
            ? <p className="text-sm text-ink-muted">No recent invitations.</p>
            : <div className="space-y-2">
                {data.recentInvitations.map(inv => (
                  <div key={inv.id} className="p-3 bg-warm-card rounded-card">
                    <p className="text-sm font-medium text-ink">{inv.event.title}</p>
                    <p className="text-xs text-ink-muted mb-2">from {inv.event.owner.name}</p>
                    {inv.invitationStatus === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => respond(inv.id, 'accept')} className="text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors">Accept</button>
                        <button onClick={() => respond(inv.id, 'decline')} className="text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">Decline</button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-pill ${inv.invitationStatus === 'accepted' ? 'bg-coral-tint text-coral-dark' : 'bg-warm-border text-ink-muted'}`}>
                        {inv.invitationStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
          }
        </section>

      </div>
    </Layout>
  );
}
