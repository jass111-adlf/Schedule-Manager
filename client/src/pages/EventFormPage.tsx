import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi } from '../api';

// datetime-local value ↔ ISO string conversions
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toISO = (local: string) => new Date(local).toISOString();

const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl   = 'block text-sm font-medium text-gray-700 mb-1';

const nowLocal = toLocal(new Date().toISOString());
const endLocal = toLocal(new Date(Date.now() + 3600_000).toISOString());

export default function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [title, setTitle]                 = useState('');
  const [description, setDescription]     = useState('');
  const [location, setLocation]           = useState('');
  const [start, setStart]                 = useState(nowLocal);
  const [end, setEnd]                     = useState(endLocal);
  const [allDay, setAllDay]               = useState(false);
  const [eventType, setEventType]         = useState('personal');
  const [visibility, setVisibility]       = useState('private');
  const [recurrence, setRecurrence]       = useState('none');
  const [repeatUntil, setRepeatUntil]     = useState('');
  const [remindMin, setRemindMin]         = useState('');
  const [remindMethod, setRemindMethod]   = useState('browser');
  const [error, setError]                 = useState('');
  const [saving, setSaving]               = useState(false);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

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
      setEventType(e.eventType);
      setVisibility(e.visibility);
      setRecurrence(e.recurrenceType);
      setRepeatUntil(e.repeatUntil?.slice(0, 10) ?? '');
      setRemindMin(e.reminderMinutesBefore?.toString() ?? '');
      setRemindMethod(e.reminderMethod ?? 'browser');
    }).catch(() => navigate('/calendar'));
  }, [id, isEdit, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setSaving(true);
    const payload: Record<string, unknown> = {
      title, timezone: tz,
      startDatetime: toISO(start), endDatetime: toISO(end),
      allDay, eventType, visibility,
      recurrenceType: recurrence,
      ...(description && { description }),
      ...(location   && { location }),
      ...(recurrence !== 'none' && repeatUntil && { repeatUntil }),
      ...(remindMin  && { reminderMinutesBefore: parseInt(remindMin), reminderMethod: remindMethod }),
    };
    try {
      isEdit ? await eventsApi.update(id!, payload) : await eventsApi.create(payload as any);
      navigate('/calendar');
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save');
    } finally { setSaving(false); }
  }

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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className={input}>
                {['work','personal','family','health','social','other'].map(t =>
                  <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Visibility</label>
              <select value={visibility} onChange={e => setVisibility(e.target.value)} className={input}>
                <option value="private">Private</option>
                <option value="invited_only">Invited only</option>
                <option value="public">Public</option>
              </select>
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Reminder</label>
              <select value={remindMin} onChange={e => setRemindMin(e.target.value)} className={input}>
                <option value="">None</option>
                <option value="10">10 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
              </select>
            </div>
            {remindMin && (
              <div>
                <label className={lbl}>Method</label>
                <select value={remindMethod} onChange={e => setRemindMethod(e.target.value)} className={input}>
                  <option value="browser">Browser</option>
                  <option value="email">Email</option>
                  <option value="both">Both</option>
                </select>
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
