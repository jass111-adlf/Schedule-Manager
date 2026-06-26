import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, calendarsApi, eventTypesApi, Calendar, CustomEventType } from '../api';

const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toISO = (local: string) => new Date(local).toISOString();

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl   = 'block text-sm font-medium text-gray-700 mb-1';

const nowLocal = toLocal(new Date().toISOString());
const endLocal = toLocal(new Date(Date.now() + 3600_000).toISOString());

const BUILTIN_TYPES = [
  { id: 'work',     name: 'Work',     color: '#3b82f6' },
  { id: 'personal', name: 'Personal', color: '#a855f7' },
  { id: 'family',   name: 'Family',   color: '#22c55e' },
  { id: 'health',   name: 'Health',   color: '#ef4444' },
  { id: 'social',   name: 'Social',   color: '#facc15' },
  { id: 'other',    name: 'Other',    color: '#9ca3af' },
];

const STANDARD_REMINDERS = [
  { label: '10 min before', value: '10' },
  { label: '30 min before', value: '30' },
  { label: '1 hour before', value: '60' },
  { label: '1 day before',  value: '1440' },
];

export default function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [title, setTitle]           = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation]     = useState('');
  const [start, setStart]           = useState(nowLocal);
  const [end, setEnd]               = useState(endLocal);
  const [allDay, setAllDay]         = useState(false);
  const [visibility, setVisibility] = useState('private');
  const [recurrence, setRecurrence] = useState('none');
  const [repeatUntil, setRepeatUntil] = useState('');

  // Calendar
  const [calendarId, setCalendarId] = useState('');
  const [calendars, setCalendars]   = useState<Calendar[]>([]);

  // Event type
  const [eventType, setEventType]       = useState('personal');
  const [customTypeId, setCustomTypeId] = useState('');
  const [customTypes, setCustomTypes]   = useState<CustomEventType[]>([]);
  const [showNewType, setShowNewType]   = useState(false);
  const [newTypeName, setNewTypeName]   = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#6b7280');

  // Reminder
  const [remindMin, setRemindMin]     = useState('');    // standard value or 'custom'
  const [customMin, setCustomMin]     = useState('');    // free-text custom minutes
  const [remindMethod, setRemindMethod] = useState('browser');

  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    Promise.all([calendarsApi.list(), eventTypesApi.list()]).then(([cals, types]) => {
      setCalendars(cals.data.data.calendars);
      setCustomTypes(types.data.data.types);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    eventsApi.get(id!).then(r => {
      const e = r.data.data.event as any;
      setTitle(e.title);
      setDescription(e.description ?? '');
      setLocation(e.location ?? '');
      setStart(toLocal(e.startDatetime ?? e.start));
      setEnd(toLocal(e.endDatetime ?? e.end));
      setAllDay(e.allDay);
      setVisibility(e.visibility);
      setRecurrence(e.recurrenceType);
      setRepeatUntil(e.repeatUntil?.slice(0, 10) ?? '');
      setCalendarId(e.calendarId ?? '');
      if (e.customTypeId) { setCustomTypeId(e.customTypeId); setEventType('other'); }
      else { setEventType(e.eventType); }
      const rm = e.reminderMinutesBefore?.toString() ?? '';
      const isStd = STANDARD_REMINDERS.some(o => o.value === rm);
      if (!rm)       { setRemindMin(''); }
      else if (isStd) { setRemindMin(rm); }
      else           { setRemindMin('custom'); setCustomMin(rm); }
      setRemindMethod(e.reminderMethod ?? 'browser');
    }).catch(() => navigate('/calendar'));
  }, [id, isEdit, navigate]);

  async function handleCreateCustomType() {
    if (!newTypeName.trim()) return;
    const r = await eventTypesApi.create({ name: newTypeName.trim(), color: newTypeColor });
    const t = r.data.data.type;
    setCustomTypes(prev => [...prev, t]);
    setCustomTypeId(t.id); setEventType('other');
    setShowNewType(false); setNewTypeName(''); setNewTypeColor('#6b7280');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault(); setError(''); setSaving(true);
    const resolvedMin = remindMin === 'custom' ? customMin : remindMin;
    const payload: Record<string, unknown> = {
      title, timezone: tz,
      startDatetime: toISO(start), endDatetime: toISO(end),
      allDay, visibility, eventType,
      recurrenceType: recurrence,
      ...(description && { description }),
      ...(location   && { location }),
      ...(calendarId && { calendarId }),
      ...(customTypeId && { customTypeId }),
      ...(recurrence !== 'none' && repeatUntil && { repeatUntil }),
      ...(resolvedMin && { reminderMinutesBefore: parseInt(resolvedMin), reminderMethod: remindMethod }),
    };
    try {
      isEdit ? await eventsApi.update(id!, payload) : await eventsApi.create(payload);
      navigate('/calendar');
    } catch (err: unknown) {
      setError((err as any)?.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  }

  const selectedColor = customTypeId
    ? customTypes.find(t => t.id === customTypeId)?.color ?? '#9ca3af'
    : BUILTIN_TYPES.find(t => t.id === eventType)?.color ?? '#9ca3af';

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">{isEdit ? 'Edit event' : 'New event'}</h1>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">

          <div>
            <label className={lbl}>Title *</label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className={input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Start *</label>
              <input type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} className={input} disabled={allDay} />
            </div>
            <div>
              <label className={lbl}>End *</label>
              <input type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} className={input} disabled={allDay} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} className="w-4 h-4" />
            All day
          </label>

          {/* Event type */}
          <div>
            <label className={lbl}>Event type</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BUILTIN_TYPES.map(t => {
                const active = !customTypeId && eventType === t.id;
                return (
                  <button type="button" key={t.id}
                    onClick={() => { setEventType(t.id); setCustomTypeId(''); }}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${active ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                    style={active ? { backgroundColor: t.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                );
              })}
              {customTypes.map(t => {
                const active = customTypeId === t.id;
                return (
                  <button type="button" key={t.id}
                    onClick={() => { setCustomTypeId(t.id); setEventType('other'); }}
                    className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${active ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}
                    style={active ? { backgroundColor: t.color } : {}}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </button>
                );
              })}
              <button type="button" onClick={() => setShowNewType(v => !v)}
                className="text-xs px-2.5 py-1 rounded-full border border-dashed border-blue-400 text-blue-500 hover:bg-blue-50">
                + Custom
              </button>
            </div>

            {showNewType && (
              <div className="flex gap-2 items-center mt-1">
                <input type="text" placeholder="Type name" value={newTypeName} onChange={e => setNewTypeName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="color" value={newTypeColor} onChange={e => setNewTypeColor(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-gray-300" />
                <button type="button" onClick={handleCreateCustomType} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }} />
              <span className="text-xs text-gray-500">Calendar color for this event</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value)} className={input}>
                <option value="private">Private</option>
                <option value="invited_only">Invited only</option>
                <option value="friends">Friends</option>
                <option value="public">Public</option>
              </select>
            </div>
            {calendars.length > 0 && (
              <div>
                <label className={lbl}>Calendar</label>
                <select value={calendarId} onChange={e => setCalendarId(e.target.value)} className={input}>
                  <option value="">— Uncategorised —</option>
                  {calendars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={input} />
          </div>

          <div>
            <label className={lbl}>Location</label>
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} className={input} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Repeat</label>
              <select value={recurrence} onChange={e => setRecurrence(e.target.value)} className={input}>
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {recurrence !== 'none' && (
              <div>
                <label className={lbl}>Until *</label>
                <input type="date" required value={repeatUntil} onChange={e => setRepeatUntil(e.target.value)} className={input} />
              </div>
            )}
          </div>

          {/* Reminder */}
          <div>
            <label className={lbl}>Reminder</label>
            <div className="grid grid-cols-2 gap-3">
              <select value={remindMin} onChange={e => { setRemindMin(e.target.value); setCustomMin(''); }} className={input}>
                <option value="">None</option>
                {STANDARD_REMINDERS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value="custom">Custom…</option>
              </select>
              {remindMin && (
                <select value={remindMethod} onChange={e => setRemindMethod(e.target.value)} className={input}>
                  <option value="browser">Browser</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
              )}
            </div>
            {remindMin === 'custom' && (
              <div className="mt-2">
                <input type="number" min={1} placeholder="Minutes before event" value={customMin}
                  onChange={e => setCustomMin(e.target.value)} className={input} />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
            </button>
            <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
