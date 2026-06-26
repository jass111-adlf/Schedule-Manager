import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { usersApi, friendsApi, User, Calendar } from '../api';

type FriendRequest = { id: string; requester: User; createdAt: string };

// ── Friend requests panel ─────────────────────────────────────

function RequestsPanel({ requests, onAccept, onDecline }: {
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending requests</p>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-sm font-medium text-gray-800">{r.requester.name}</p>
              <p className="text-xs text-gray-500">{r.requester.email}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onAccept(r.id)} className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700">Accept</button>
              <button onClick={() => onDecline(r.id)} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── User card with friend action + calendar view ───────────────

function UserCard({ u, onFriendAction }: {
  u: User & { friendshipId?: string | null; friendshipStatus?: string | null; iRequested?: boolean };
  onFriendAction: () => void;
}) {
  const [calendars, setCalendars]   = useState<Calendar[] | null>(null);
  const [isFriend, setIsFriend]     = useState(false);
  const [showCals, setShowCals]     = useState(false);

  async function toggleCals() {
    if (!showCals && calendars === null) {
      const r = await usersApi.getCalendars(u.id);
      setCalendars(r.data.data.calendars);
      setIsFriend(r.data.data.isFriend);
    }
    setShowCals(v => !v);
  }

  async function sendRequest() {
    await friendsApi.sendRequest(u.id); onFriendAction();
  }
  async function removeOrDecline() {
    if (u.friendshipId) { await friendsApi.remove(u.friendshipId); onFriendAction(); }
  }

  const VIS_BADGE: Record<string, string> = {
    public: 'bg-green-100 text-green-700',
    private: 'bg-gray-100 text-gray-600',
    share_only: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">{u.name}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={toggleCals} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
            {showCals ? 'Hide calendars' : 'View calendars'}
          </button>
          {u.friendshipStatus === 'accepted' ? (
            <button onClick={removeOrDecline} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Unfriend</button>
          ) : u.friendshipStatus === 'pending' && u.iRequested ? (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">Request sent</span>
          ) : u.friendshipStatus === 'pending' ? (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending</span>
          ) : (
            <button onClick={sendRequest} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add friend</button>
          )}
        </div>
      </div>

      {showCals && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {calendars === null ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : calendars.length === 0 ? (
            <p className="text-xs text-gray-400">No visible calendars.</p>
          ) : (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 mb-1">{isFriend ? 'Friend + public' : 'Public'} calendars</p>
              {calendars.map(c => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-sm text-gray-700">{c.name}</span>
                  <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${VIS_BADGE[c.visibility]}`}>
                    {c.visibility === 'share_only' ? 'Shared with you' : c.visibility}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── People page ───────────────────────────────────────────────

export default function PeoplePage() {
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState<User[]>([]);
  const [friends, setFriends]   = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searched, setSearched] = useState(false);

  async function load() {
    const [fr, rq] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
    setFriends(fr.data.data.friends);
    setRequests(rq.data.data.requests);
  }
  useEffect(() => { load(); }, []);

  async function search() {
    if (q.trim().length < 2) return;
    const r = await usersApi.search(q.trim());
    setResults(r.data.data.users);
    setSearched(true);
  }

  async function acceptRequest(id: string) { await friendsApi.accept(id); load(); setResults([]); setSearched(false); }
  async function declineRequest(id: string) { await friendsApi.remove(id); load(); }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">People</h1>

        {/* Incoming friend requests */}
        <RequestsPanel requests={requests} onAccept={acceptRequest} onDecline={declineRequest} />

        {/* Search */}
        <div className="flex gap-2 mb-6">
          <input
            type="text" placeholder="Search by name or email…" value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), search())}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={search} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
        </div>

        {/* Search results */}
        {searched && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Results</p>
            {results.length === 0 ? (
              <p className="text-sm text-gray-400">No users found.</p>
            ) : (
              <div className="space-y-2">
                {results.map(u => <UserCard key={u.id} u={u} onFriendAction={() => { load(); search(); }} />)}
              </div>
            )}
          </div>
        )}

        {/* Friends list */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Friends ({friends.length})</p>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-400">No friends yet. Search for people to connect.</p>
          ) : (
            <div className="space-y-2">
              {friends.map(u => <UserCard key={u.id} u={{ ...u, friendshipStatus: 'accepted' }} onFriendAction={load} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
