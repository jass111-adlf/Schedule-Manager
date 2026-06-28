import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi, friendsApi, User } from '../api';

type FriendUser = User & { friendshipId: string };
type FriendRequest = { id: string; requester: User; createdAt: string };

// ── Pending friend requests ────────────────────────────────────

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

// ── Friends list ──────────────────────────────────────────────

function FriendCard({ friend, onRemove, onViewProfile }: {
  friend: FriendUser;
  onRemove: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-800">{friend.name}</p>
        <p className="text-xs text-gray-500">{friend.email}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onViewProfile} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
          View profile
        </button>
        <button onClick={onRemove} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
          Remove
        </button>
      </div>
    </div>
  );
}

// ── Search result card ────────────────────────────────────────

function SearchCard({ u, onAction, onViewProfile }: {
  u: User & { friendshipId?: string | null; friendshipStatus?: string | null; iRequested?: boolean };
  onAction: () => void;
  onViewProfile: () => void;
}) {
  async function sendRequest() { await friendsApi.sendRequest(u.id); onAction(); }
  async function remove() { if (u.friendshipId) { await friendsApi.remove(u.friendshipId); onAction(); } }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
      <div>
        <p className="text-sm font-medium text-gray-800">{u.name}</p>
        <p className="text-xs text-gray-500">{u.email}</p>
      </div>
      <div className="flex gap-2">
        <button onClick={onViewProfile} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">
          View profile
        </button>
        {u.friendshipStatus === 'accepted' ? (
          <button onClick={remove} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Unfriend</button>
        ) : u.friendshipStatus === 'pending' && u.iRequested ? (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded">Request sent</span>
        ) : u.friendshipStatus === 'pending' ? (
          <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Pending</span>
        ) : (
          <button onClick={sendRequest} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add friend</button>
        )}
      </div>
    </div>
  );
}

// ── People page ───────────────────────────────────────────────

export default function PeoplePage() {
  const navigate = useNavigate();
  const [q, setQ]               = useState('');
  const [results, setResults]   = useState<User[]>([]);
  const [friends, setFriends]   = useState<FriendUser[]>([]);
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
  async function removeFriend(friendshipId: string) { await friendsApi.remove(friendshipId); load(); }

  function viewProfile(userId: string, userName: string) {
    navigate(`/people/${userId}`, { state: { name: userName } });
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">People</h1>

        {/* Incoming friend requests */}
        <RequestsPanel requests={requests} onAccept={acceptRequest} onDecline={declineRequest} />

        {/* Friends list */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Friends ({friends.length})
          </p>
          {friends.length === 0 ? (
            <p className="text-sm text-gray-400">No friends yet. Search for people to connect.</p>
          ) : (
            <div className="space-y-2">
              {friends.map(f => (
                <FriendCard
                  key={f.id}
                  friend={f}
                  onRemove={() => removeFriend(f.friendshipId)}
                  onViewProfile={() => viewProfile(f.id, f.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex gap-2 mb-4">
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
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Results</p>
            {results.length === 0 ? (
              <p className="text-sm text-gray-400">No users found.</p>
            ) : (
              <div className="space-y-2">
                {results.map(u => (
                  <SearchCard
                    key={u.id}
                    u={u}
                    onAction={() => { load(); search(); }}
                    onViewProfile={() => viewProfile(u.id, u.name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
