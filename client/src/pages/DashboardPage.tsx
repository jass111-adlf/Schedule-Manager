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

const TYPE_COLOR: Record<string, string> = {
  work: 'bg-blue-500', personal: 'bg-purple-500', family: 'bg-green-500',
  health: 'bg-red-500', social: 'bg-yellow-400', other: 'bg-gray-400',
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${TYPE_COLOR[event.eventType] ?? 'bg-gray-400'}`} />
      <div>
        <p className="text-sm font-medium text-gray-800">{event.title}</p>
        <p className="text-xs text-gray-500">{fmtDate(event.start)} · {event.allDay ? 'All day' : fmtTime(event.start)}</p>
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

  if (!data) return <Layout><div className="text-sm text-gray-400 py-10 text-center">Loading…</div></Layout>;

  return (
    <Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today</h2>
          {data.todayEvents.length === 0
            ? <p className="text-sm text-gray-400">Nothing today.</p>
            : <div className="space-y-2">{sortEvents(data.todayEvents).map(e => <EventCard key={e.id + e.start} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}</div>
          }
          <button onClick={() => navigate('/events/new')} className="mt-3 text-xs text-blue-600 hover:underline">+ New event</button>
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Next 7 days</h2>
          {data.upcomingEvents.length === 0
            ? <p className="text-sm text-gray-400">Nothing upcoming.</p>
            : <div className="space-y-2">{sortEvents(data.upcomingEvents).map(e => <EventCard key={e.id + e.start} event={e} onClick={() => navigate(`/events/${e.id}`)} />)}</div>
          }
        </section>

        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Invitations</h2>
          {data.recentInvitations.length === 0
            ? <p className="text-sm text-gray-400">No recent invitations.</p>
            : <div className="space-y-2">
                {data.recentInvitations.map(inv => (
                  <div key={inv.id} className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                    <p className="text-sm font-medium text-gray-800">{inv.event.title}</p>
                    <p className="text-xs text-gray-500 mb-2">from {inv.event.owner.name}</p>
                    {inv.invitationStatus === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => respond(inv.id, 'accept')} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Accept</button>
                        <button onClick={() => respond(inv.id, 'decline')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Decline</button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.invitationStatus === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
