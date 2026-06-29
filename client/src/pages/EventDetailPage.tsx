import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, invitationsApi, usersApi, User } from '../api';
import { useAuth } from '../auth';

const STATUS_BADGE: Record<string, string> = {
  upcoming:  'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-600',
};

const fmtDt = (iso: string) =>
  new Date(iso).toLocaleString('default', { dateStyle: 'medium', timeStyle: 'short' });

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent]               = useState<any>(null);
  const [loading, setLoading]           = useState(true);
  const [searchEmail, setSearchEmail]   = useState('');
  const [results, setResults]           = useState<User[]>([]);
  const [inviteMsg, setInviteMsg]       = useState('');

  useEffect(() => {
    eventsApi.get(id!)
      .then(r => setEvent(r.data.data.event))
      .catch(() => navigate('/calendar'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Layout><div className="text-sm text-gray-400 py-10 text-center">Loading…</div></Layout>;
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
            <h1 className="text-2xl font-semibold text-gray-800">{event.title}</h1>
            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[event.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {event.status}
            </span>
          </div>
          {isOwner && notCancelled && (
            <div className="flex gap-2 flex-wrap justify-end">
              <button onClick={() => navigate(`/events/${id}/edit`)} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">Edit</button>
              <button onClick={handleCancel} className="text-sm px-3 py-1.5 border border-yellow-300 text-yellow-700 rounded-lg hover:bg-yellow-50">Cancel</button>
              <button onClick={handleDelete} className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50">Delete</button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {/* Core details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Start</p>
              <p className="text-gray-800">{event.allDay ? 'All day' : fmtDt(event.startDatetime ?? event.start)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">End</p>
              <p className="text-gray-800">{event.allDay ? '—' : fmtDt(event.endDatetime ?? event.end)}</p>
            </div>
            {event.location && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-0.5">Location</p>
                <p className="text-gray-800">{event.location}</p>
              </div>
            )}
            {event.recurrenceType !== 'none' && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Repeats</p>
                <p className="text-gray-800 capitalize">{event.recurrenceType} until {event.repeatUntil?.slice(0, 10)}</p>
              </div>
            )}
          </div>

          {event.description && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Invitee: accept / decline */}
          {myInvite?.invitationStatus === 'pending' && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-600 mb-2">You've been invited to this event.</p>
              <div className="flex gap-2">
                <button onClick={() => respond('accept')}  className="text-sm px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700">Accept</button>
                <button onClick={() => respond('decline')} className="text-sm px-4 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Decline</button>
              </div>
            </div>
          )}

          {/* Owner: invite section */}
          {isOwner && notCancelled && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Invite people</p>
              <div className="flex gap-2">
                <input
                  type="email" placeholder="Search by email" value={searchEmail}
                  onChange={e => { setSearchEmail(e.target.value); setInviteMsg(''); }}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), searchUsers())}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={searchUsers} className="text-sm px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
              </div>
              {inviteMsg && <p className="text-xs mt-1 text-green-600">{inviteMsg}</p>}
              {results.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                  {results.map(u => (
                    <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                      <div>
                        <p className="text-sm text-gray-800">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <button onClick={() => invite(u.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Invite</button>
                    </div>
                  ))}
                </div>
              )}
              {event.invitations?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Invited</p>
                  {event.invitations.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between py-1 text-sm">
                      <span className="text-gray-700">{inv.invitedUser.name} <span className="text-gray-400 text-xs">({inv.invitedUser.email})</span></span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${inv.invitationStatus === 'accepted' ? 'bg-green-100 text-green-700' : inv.invitationStatus === 'declined' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.invitationStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">← Back</button>
      </div>
    </Layout>
  );
}
