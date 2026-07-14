import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi, friendsApi, User } from '../api';

type FriendUser = User & { friendshipId: string };
type FriendRequest = { id: string; requester: User; createdAt: string };

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span
      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-coral-dark flex-shrink-0"
      style={{ backgroundColor: '#f5c4b3' }}
    >
      {initials}
    </span>
  );
}

function RequestsPanel({ requests, onAccept, onDecline }: {
  requests: FriendRequest[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="mb-6">
      <p className="text-[13px] font-semibold text-coral-dark mb-2">Pending requests</p>
      <div className="space-y-2">
        {requests.map(r => (
          <div key={r.id} className="bg-white rounded-container p-3 flex items-center justify-between border border-warm-border">
            <div className="flex items-center gap-3">
              <Avatar name={r.requester.name} />
              <div>
                <p className="text-sm font-medium text-ink">{r.requester.name}</p>
                <p className="text-xs text-ink-muted">{r.requester.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => onAccept(r.id)} className="text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors">Accept</button>
              <button onClick={() => onDecline(r.id)} className="text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">Decline</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendCard({ friend, onRemove, onViewProfile }: {
  friend: FriendUser;
  onRemove: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className="bg-white rounded-container p-4 flex items-center justify-between border border-warm-border">
      <div className="flex items-center gap-3">
        <Avatar name={friend.name} />
        <div>
          <p className="text-sm font-medium text-ink">{friend.name}</p>
          <p className="text-xs text-ink-muted">{friend.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onViewProfile} className="text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">
          View profile
        </button>
        <button onClick={onRemove} className="text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill hover:bg-warm-border transition-colors">
          Remove
        </button>
      </div>
    </div>
  );
}

function SearchCard({ u, onAction, onViewProfile }: {
  u: User & { friendshipId?: string | null; friendshipStatus?: string | null; iRequested?: boolean };
  onAction: () => void;
  onViewProfile: () => void;
}) {
  async function sendRequest() { await friendsApi.sendRequest(u.id); onAction(); }
  async function remove() { if (u.friendshipId) { await friendsApi.remove(u.friendshipId); onAction(); } }

  return (
    <div className="bg-white rounded-container p-4 flex items-center justify-between border border-warm-border">
      <div className="flex items-center gap-3">
        <Avatar name={u.name} />
        <div>
          <p className="text-sm font-medium text-ink">{u.name}</p>
          <p className="text-xs text-ink-muted">{u.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onViewProfile} className="text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors">
          View profile
        </button>
        {u.friendshipStatus === 'accepted' ? (
          <button onClick={remove} className="text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill hover:bg-warm-border transition-colors">Unfriend</button>
        ) : u.friendshipStatus === 'pending' && u.iRequested ? (
          <span className="text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill">Sent</span>
        ) : u.friendshipStatus === 'pending' ? (
          <span className="text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill">Pending</span>
        ) : (
          <button onClick={sendRequest} className="text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors">Add</button>
        )}
      </div>
    </div>
  );
}

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
        <h1 className="text-2xl font-bold text-ink mb-5">People</h1>

        <RequestsPanel requests={requests} onAccept={acceptRequest} onDecline={declineRequest} />

        <div className="mb-6">
          <p className="text-[13px] font-semibold text-coral-dark mb-2">
            Friends {friends.length > 0 && `(${friends.length})`}
          </p>
          {friends.length === 0 ? (
            <p className="text-sm text-ink-muted">No friends yet. Search for people to connect.</p>
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

        <div className="flex gap-2 mb-4">
          <input
            type="text" placeholder="Search by name or email…" value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), search())}
            className="flex-1 border border-warm-border rounded-[10px] px-3 py-2 text-sm text-ink focus:outline-none focus:border-coral transition-colors"
          />
          <button onClick={search} className="px-4 py-2 bg-coral text-white text-sm rounded-pill hover:bg-coral-hover transition-colors">Search</button>
        </div>

        {searched && (
          <div>
            <p className="text-[13px] font-semibold text-coral-dark mb-2">Results</p>
            {results.length === 0 ? (
              <p className="text-sm text-ink-muted">No users found.</p>
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
