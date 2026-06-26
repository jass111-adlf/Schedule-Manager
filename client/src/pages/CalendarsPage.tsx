import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { calendarsApi, usersApi, Calendar, User } from '../api';

type Tab = 'mine' | 'shared';
const VIS_LABEL = { public: 'Public', private: 'Private', share_only: 'Share-only' };
const VIS_BADGE = { public: 'bg-green-100 text-green-700', private: 'bg-gray-100 text-gray-600', share_only: 'bg-yellow-100 text-yellow-700' };

// ── Create / edit form ────────────────────────────────────────

function CalendarForm({ initial, onSave, onCancel }: {
  initial?: Partial<Calendar>;
  onSave: (data: { name: string; color: string; visibility: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName]   = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#3b82f6');
  const [vis, setVis]     = useState(initial?.visibility ?? 'private');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <input
        type="text" placeholder="Calendar name" value={name} onChange={e => setName(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-8 w-12 cursor-pointer rounded border border-gray-300" />
        </div>
        <select value={vis} onChange={e => setVis(e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
          <option value="private">Private</option>
          <option value="public">Public</option>
          <option value="share_only">Share-only</option>
        </select>
      </div>
      <div className="flex gap-2">
        <button onClick={() => name.trim() && onSave({ name: name.trim(), color, visibility: vis })} disabled={!name.trim()} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">Save</button>
        <button onClick={onCancel} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
      </div>
    </div>
  );
}

// ── Share panel ───────────────────────────────────────────────

function SharePanel({ cal, onUpdate }: { cal: Calendar; onUpdate: () => void }) {
  const [q, setQ]         = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [msg, setMsg]     = useState('');

  async function search() {
    if (q.trim().length < 2) return;
    const r = await usersApi.search(q.trim());
    setResults(r.data.data.users);
  }
  async function share(userId: string) {
    await calendarsApi.share(cal.id, userId);
    setMsg('Shared!'); setResults([]); setQ(''); onUpdate();
  }
  async function revoke(userId: string) {
    await calendarsApi.revokeShare(cal.id, userId);
    onUpdate();
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <p className="text-xs font-medium text-gray-600 mb-2">Share with people</p>
      <div className="flex gap-2">
        <input type="text" placeholder="Search by name or email" value={q}
          onChange={e => { setQ(e.target.value); setMsg(''); }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), search())}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button onClick={search} className="text-sm px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
      </div>
      {msg && <p className="text-xs text-green-600 mt-1">{msg}</p>}
      {results.length > 0 && (
        <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          {results.map(u => (
            <div key={u.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
              <div>
                <p className="text-sm text-gray-800">{u.name}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <button onClick={() => share(u.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Share</button>
            </div>
          ))}
        </div>
      )}
      {(cal.shares?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-xs text-gray-500">Shared with</p>
          {cal.shares!.map(s => (
            <div key={s.id} className="flex items-center justify-between text-sm py-0.5">
              <span className="text-gray-700">{s.sharedWith.name} <span className="text-gray-400 text-xs">({s.sharedWith.email})</span></span>
              <button onClick={() => revoke(s.sharedWith.id)} className="text-xs text-red-500 hover:text-red-700">Revoke</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function CalendarsPage() {
  const [tab, setTab]               = useState<Tab>('mine');
  const [calendars, setCalendars]   = useState<Calendar[]>([]);
  const [sharedWith, setSharedWith] = useState<(Calendar & { owner?: any })[]>([]);
  const [creating, setCreating]     = useState(false);
  const [editing, setEditing]       = useState<string | null>(null);
  const [expanded, setExpanded]     = useState<string | null>(null);

  async function loadMine() {
    const r = await calendarsApi.list();
    setCalendars(r.data.data.calendars);
  }
  async function loadShared() {
    const r = await calendarsApi.sharedWithMe();
    setSharedWith(r.data.data.calendars);
  }

  useEffect(() => { loadMine(); loadShared(); }, []);

  async function handleCreate(data: { name: string; color: string; visibility: string }) {
    await calendarsApi.create(data);
    setCreating(false); loadMine();
  }
  async function handleEdit(id: string, data: { name: string; color: string; visibility: string }) {
    await calendarsApi.update(id, data);
    setEditing(null); loadMine();
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this calendar? Events will become uncategorised.')) return;
    await calendarsApi.delete(id); loadMine();
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-800">Calendars</h1>
          {tab === 'mine' && (
            <button onClick={() => { setCreating(true); setEditing(null); }} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ New</button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          {(['mine', 'shared'] as Tab[]).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'mine' ? 'My Calendars' : 'Shared Calendars'}
            </button>
          ))}
        </div>

        {tab === 'mine' && (
          <div className="space-y-3">
            {creating && <CalendarForm onSave={handleCreate} onCancel={() => setCreating(false)} />}
            {calendars.length === 0 && !creating && (
              <p className="text-sm text-gray-400">No calendars yet. Create one to organise your events.</p>
            )}
            {calendars.map(cal => (
              <div key={cal.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                {editing === cal.id ? (
                  <CalendarForm initial={cal} onSave={d => handleEdit(cal.id, d)} onCancel={() => setEditing(null)} />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                        <span className="text-sm font-medium text-gray-800">{cal.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${VIS_BADGE[cal.visibility]}`}>{VIS_LABEL[cal.visibility]}</span>
                      </div>
                      <div className="flex gap-2">
                        {cal.visibility !== 'private' && (
                          <button onClick={() => setExpanded(expanded === cal.id ? null : cal.id)} className="text-xs text-blue-600 hover:underline">
                            {expanded === cal.id ? 'Hide' : 'Share'}
                          </button>
                        )}
                        <button onClick={() => setEditing(cal.id)} className="text-xs text-gray-500 hover:text-gray-700">Edit</button>
                        <button onClick={() => handleDelete(cal.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </div>
                    {expanded === cal.id && <SharePanel cal={cal} onUpdate={loadMine} />}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'shared' && (
          <div className="space-y-3">
            {sharedWith.length === 0 ? (
              <p className="text-sm text-gray-400">No calendars have been shared with you.</p>
            ) : (
              sharedWith.map(cal => (
                <div key={cal.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{cal.name}</p>
                    {cal.owner && <p className="text-xs text-gray-500">Shared by {cal.owner.name}</p>}
                  </div>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${VIS_BADGE[cal.visibility]}`}>{VIS_LABEL[cal.visibility]}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
