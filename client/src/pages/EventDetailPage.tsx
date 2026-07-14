import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, invitationsApi, usersApi, User } from '../api';
import { useAuth } from '../auth';

const STATUS_BADGE: Record<string, string> = {
  upcoming:  'bg-coral-tint text-coral-dark',
  completed: 'bg-warm-card text-ink-muted',
  cancelled: 'bg-warm-border text-ink-muted',
};

const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString('default', { dateStyle: 'medium', timeStyle: 'short' });

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent]             = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [results, setResults]         = useState<User[]>([]);
  const [inviteMsg, setInviteMsg]     = useState('');

  useEffect(() => {
    eventsApi.get(id!)
      .then(r => setEvent(r.data.data.event))
      .catch(() => navigate('/calendar'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Layout><div className="text-sm text-ink-muted py-10 text-center">Loading…</div></Layout>;
  if (!event) return null;

  const isOwner    = event.createdBy === user?.id;
  const myInvite   = event.invitations?.find((i: any) => i.invitedUserId === user?.id);
  const notCancelled = event.status !== 'cancelled';

  async function handleCancel() {
    if (!confirm('Cancel this event for everyone?')) return;
    await eventsApi.cancel(id!); navigate('/calendar');
  }
  async function handleDelete() {
    if (!confirm('Permanently delete this event?')) return;
    await eventsApi.delete(id!); navigate('/calendar');
  }
  async function searchUsers() {
    if (searchEmail.trim().length < 2) return;
    const r = await usersApi.search(searchEmail.trim());
    setResults(r.data.data.users);
  }
  async function invite(userId: string) {
    try {
      await eventsApi.invite(id!, userId);
      setInviteMsg('Invited!'); setResults([]); setSearchEmail('');
      const r = await eventsApi.get(id!); setEvent(r.data.data.event);
    } catch (err: unknown) {
      setInviteMsg((err as any)?.response?.data?.message ?? 'Failed to invite');
    }
  }
  async function respond(action: 'accept' | 'decline') {
    action === 'accept'
      ? await invitationsApi.accept(myInvite.id)
      : await invitationsApi.decline(myInvite.id);
    navigate('/');
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-ink">{event.title}</h1>
            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-pill font-medium ${STATUS_BADGE[event.status] ?? 'bg-warm-card text-ink-muted'}`}>
              {event.status}
            </span>
          </div>
          {isOwner && notCancelled && (
            <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={() => navigate(`/events/${id}/edit`)} className="text-sm px-3 py-1.5 border border-warm-border rounded-pill hover:bg-warm-card text-ink transition-colors">Edit</button>
              <button onClick={handleCancel} className="text-sm px-3 py-1.5 border border-coral-soft text-coral-dark rounded-pill hover:bg-coral-tint transition-colors">Cancel</button>
              <button onClick={handleDelete} className="text-sm px-3 py-1.5 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">Delete</button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-container border border-warm-border p-6 space-y-4">
          {/* Core details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Start</p>
              <p className="text-ink">{event.allDay ? 'All day' : fmtDt(event.startDatetime ?? event.start)}</p>
            </div>
            <div>
              <p className="text-xs text-ink-muted mb-0.5">End</p>
              <p className="text-ink">{event.allDay ? '—' : fmtDt(event.endDatetime ?? event.end)}</p>
            </div>
            {event.location && (
              <div className="col-span-2">
                <p className="text-xs text-ink-muted mb-0.5">Location</p>
                <p className="text-ink">{event.location}</p>
              </div>
            )}
            {event.recurrenceType !== 'none' && (
              <div>
                <p className="text-xs text-ink-muted mb-0.5">Repeats</p>
                <p className="text-ink capitalize">{event.recurrenceType} until {event.repeatUntil?.slice(0, 10)}</p>
              </div>
            )}
          </div>

          {event.description && (
            <div className="pt-2 border-t border-warm-border">
              <p className="text-xs text-ink-muted mb-1">Description</p>
              <p className="text-sm text-ink whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Invitee: accept / decline */}
          {myInvite?.invitationStatus === 'pending' && (
            <div className="pt-2 border-t border-warm-border">
              <p className="text-sm text-ink-muted mb-2">You've been invited to this event.</p>
              <div className="flex gap-2">
                <button onClick={() => respond('accept')}  className="text-sm px-4 py-1.5 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors">Accept</button>
                <button onClick={() => respond('decline')} className="text-sm px-4 py-1.5 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">Decline</button>
              </div>
            </div>
          )}

          {/* Owner: invite section */}
          {isOwner && notCancelled && (
            <div className="pt-2 border-t border-warm-border">
              <p className="text-[13px] font-semibold text-coral-dark mb-2">Invite people</p>
              <div className="flex gap-2">
                <input
                  type="email" placeholder="Search by email" value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setInviteMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUsers())}
                  className="flex-1 border border-warm-border rounded-[10px] px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-coral transition-colors"
                />
                <button onClick={searchUsers} className="text-sm px-3 py-1.5 bg-warm-card rounded-pill hover:bg-warm-border text-ink transition-colors">Search</button>
              </div>
              {inviteMsg && <p className="text-xs mt-1 text-coral-dark">{inviteMsg}</p>}
              {results.length > 0 && (
                <div className="mt-2 border border-warm-border rounded-card overflow-hidden">
                  {results.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-coral-tint transition-colors">
                      <div>
                        <p className="text-sm text-ink">{u.name}</p>
                        <p className="text-xs text-ink-muted">{u.email}</p>
                      </div>
                      <button onClick={() => invite(u.id)} className="text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors">Invite</button>
                    </div>
                  ))}
                </div>
              )}
              {event.invitations?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-ink-muted mb-1">Invited</p>
                  {event.invitations.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-ink">{inv.invitedUser.name} <span className="text-ink-muted text-xs">({inv.invitedUser.email})</span></span>
                      <span className={`text-xs px-2 py-0.5 rounded-pill ${inv.invitationStatus === 'accepted' ? 'bg-coral-tint text-coral-dark' : inv.invitationStatus === 'declined' ? 'bg-warm-border text-ink-muted' : 'bg-coral-soft text-coral-dark'}`}>
                        {inv.invitationStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-ink-muted hover:text-ink transition-colors">← Back</button>
      </div>
    </Layout>
  );
}
