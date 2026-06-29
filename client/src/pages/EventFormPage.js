import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, eventTypesApi } from '../api';
const toLocal = (iso) => {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toISO = (local) => new Date(local).toISOString();
const input = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const lbl = 'block text-sm font-medium text-gray-700 mb-1';
const nowLocal = toLocal(new Date().toISOString());
const endLocal = toLocal(new Date(Date.now() + 3600000).toISOString());
const BUILTIN_TYPES = [
    { id: 'work', name: 'Work', color: '#3b82f6' },
    { id: 'personal', name: 'Personal', color: '#a855f7' },
    { id: 'family', name: 'Family', color: '#22c55e' },
    { id: 'health', name: 'Health', color: '#ef4444' },
    { id: 'social', name: 'Social', color: '#facc15' },
    { id: 'other', name: 'Other', color: '#9ca3af' },
];
const STANDARD_REMINDERS = [
    { label: '10 min before', value: '10' },
    { label: '30 min before', value: '30' },
    { label: '1 hour before', value: '60' },
    { label: '1 day before', value: '1440' },
];
export default function EventFormPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [start, setStart] = useState(nowLocal);
    const [end, setEnd] = useState(endLocal);
    const [allDay, setAllDay] = useState(false);
    const [visibility, setVisibility] = useState('private');
    const [recurrence, setRecurrence] = useState('none');
    const [repeatUntil, setRepeatUntil] = useState('');
    // Event type
    const [eventType, setEventType] = useState('personal');
    const [customTypeId, setCustomTypeId] = useState('');
    const [customTypes, setCustomTypes] = useState([]);
    const [showNewType, setShowNewType] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('#6b7280');
    // Reminder
    const [remindMin, setRemindMin] = useState(''); // standard value or 'custom'
    const [customMin, setCustomMin] = useState(''); // free-text custom minutes
    const [remindMethod, setRemindMethod] = useState('browser');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    useEffect(() => {
        eventTypesApi.list().then(r => setCustomTypes(r.data.data.types)).catch(() => { });
    }, []);
    useEffect(() => {
        if (!isEdit)
            return;
        eventsApi.get(id).then(r => {
            const e = r.data.data.event;
            setTitle(e.title);
            setDescription(e.description ?? '');
            setLocation(e.location ?? '');
            setStart(toLocal(e.startDatetime ?? e.start));
            setEnd(toLocal(e.endDatetime ?? e.end));
            setAllDay(e.allDay);
            setVisibility(e.visibility);
            setRecurrence(e.recurrenceType);
            setRepeatUntil(e.repeatUntil?.slice(0, 10) ?? '');
            if (e.customTypeId) {
                setCustomTypeId(e.customTypeId);
                setEventType('other');
            }
            else {
                setEventType(e.eventType);
            }
            const rm = e.reminderMinutesBefore?.toString() ?? '';
            const isStd = STANDARD_REMINDERS.some(o => o.value === rm);
            if (!rm) {
                setRemindMin('');
            }
            else if (isStd) {
                setRemindMin(rm);
            }
            else {
                setRemindMin('custom');
                setCustomMin(rm);
            }
            setRemindMethod(e.reminderMethod ?? 'browser');
        }).catch(() => navigate('/calendar'));
    }, [id, isEdit, navigate]);
    async function handleCreateCustomType() {
        if (!newTypeName.trim())
            return;
        const r = await eventTypesApi.create({ name: newTypeName.trim(), color: newTypeColor });
        const t = r.data.data.type;
        setCustomTypes(prev => [...prev, t]);
        setCustomTypeId(t.id);
        setEventType('other');
        setShowNewType(false);
        setNewTypeName('');
        setNewTypeColor('#6b7280');
    }
    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSaving(true);
        const resolvedMin = remindMin === 'custom' ? customMin : remindMin;
        const payload = {
            title, timezone: tz,
            startDatetime: toISO(start), endDatetime: toISO(end),
            allDay, visibility, eventType,
            recurrenceType: recurrence,
            ...(description && { description }),
            ...(location && { location }),
            ...(customTypeId && { customTypeId }),
            ...(recurrence !== 'none' && repeatUntil && { repeatUntil }),
            ...(resolvedMin && { reminderMinutesBefore: parseInt(resolvedMin), reminderMethod: remindMethod }),
        };
        try {
            isEdit ? await eventsApi.update(id, payload) : await eventsApi.create(payload);
            navigate('/calendar');
        }
        catch (err) {
            setError(err?.response?.data?.message ?? 'Failed to save');
        }
        finally {
            setSaving(false);
        }
    }
    const selectedColor = customTypeId
        ? customTypes.find(t => t.id === customTypeId)?.color ?? '#9ca3af'
        : BUILTIN_TYPES.find(t => t.id === eventType)?.color ?? '#9ca3af';
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-xl mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-800 mb-6", children: isEdit ? 'Edit event' : 'New event' }), error && _jsx("p", { className: "mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: lbl, children: "Title *" }), _jsx("input", { type: "text", required: true, value: title, onChange: e => setTitle(e.target.value), className: input })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: lbl, children: "Start *" }), _jsx("input", { type: "datetime-local", required: true, value: start, onChange: e => setStart(e.target.value), className: input, disabled: allDay })] }), _jsxs("div", { children: [_jsx("label", { className: lbl, children: "End *" }), _jsx("input", { type: "datetime-local", required: true, value: end, onChange: e => setEnd(e.target.value), className: input, disabled: allDay })] })] }), _jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-700 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: allDay, onChange: e => setAllDay(e.target.checked), className: "w-4 h-4" }), "All day"] }), _jsxs("div", { children: [_jsx("label", { className: lbl, children: "Event type" }), _jsxs("div", { className: "flex flex-wrap gap-2 mb-2", children: [BUILTIN_TYPES.map(t => {
                                            const active = !customTypeId && eventType === t.id;
                                            return (_jsxs("button", { type: "button", onClick: () => { setEventType(t.id); setCustomTypeId(''); }, className: `flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${active ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`, style: active ? { backgroundColor: t.color } : {}, children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: t.color } }), t.name] }, t.id));
                                        }), customTypes.map(t => {
                                            const active = customTypeId === t.id;
                                            return (_jsxs("button", { type: "button", onClick: () => { setCustomTypeId(t.id); setEventType('other'); }, className: `flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${active ? 'text-white border-transparent' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`, style: active ? { backgroundColor: t.color } : {}, children: [_jsx("span", { className: "w-2 h-2 rounded-full", style: { backgroundColor: t.color } }), t.name] }, t.id));
                                        }), _jsx("button", { type: "button", onClick: () => setShowNewType(v => !v), className: "text-xs px-2.5 py-1 rounded-full border border-dashed border-blue-400 text-blue-500 hover:bg-blue-50", children: "+ Custom" })] }), showNewType && (_jsxs("div", { className: "flex gap-2 items-center mt-1", children: [_jsx("input", { type: "text", placeholder: "Type name", value: newTypeName, onChange: e => setNewTypeName(e.target.value), className: "flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("input", { type: "color", value: newTypeColor, onChange: e => setNewTypeColor(e.target.value), className: "h-9 w-12 cursor-pointer rounded border border-gray-300" }), _jsx("button", { type: "button", onClick: handleCreateCustomType, className: "text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Add" })] })), _jsxs("div", { className: "flex items-center gap-1.5 mt-1.5", children: [_jsx("span", { className: "w-3 h-3 rounded-full", style: { backgroundColor: selectedColor } }), _jsx("span", { className: "text-xs text-gray-500", children: "Calendar color for this event" })] })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: _jsxs("div", { children: [_jsx("label", { className: lbl, children: "Visibility" }), _jsxs("select", { value: visibility, onChange: e => setVisibility(e.target.value), className: input, children: [_jsx("option", { value: "private", children: "Private" }), _jsx("option", { value: "invited_only", children: "Invited only" }), _jsx("option", { value: "friends", children: "Friends" }), _jsx("option", { value: "public", children: "Public" })] })] }) }), _jsxs("div", { children: [_jsx("label", { className: lbl, children: "Description" }), _jsx("textarea", { value: description, onChange: e => setDescription(e.target.value), rows: 2, className: input })] }), _jsxs("div", { children: [_jsx("label", { className: lbl, children: "Location" }), _jsx("input", { type: "text", value: location, onChange: e => setLocation(e.target.value), className: input })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: lbl, children: "Repeat" }), _jsxs("select", { value: recurrence, onChange: e => setRecurrence(e.target.value), className: input, children: [_jsx("option", { value: "none", children: "Does not repeat" }), _jsx("option", { value: "daily", children: "Daily" }), _jsx("option", { value: "weekly", children: "Weekly" }), _jsx("option", { value: "monthly", children: "Monthly" })] })] }), recurrence !== 'none' && (_jsxs("div", { children: [_jsx("label", { className: lbl, children: "Until *" }), _jsx("input", { type: "date", required: true, value: repeatUntil, onChange: e => setRepeatUntil(e.target.value), className: input })] }))] }), _jsxs("div", { children: [_jsx("label", { className: lbl, children: "Reminder" }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("select", { value: remindMin, onChange: e => { setRemindMin(e.target.value); setCustomMin(''); }, className: input, children: [_jsx("option", { value: "", children: "None" }), STANDARD_REMINDERS.map(o => _jsx("option", { value: o.value, children: o.label }, o.value)), _jsx("option", { value: "custom", children: "Custom\u2026" })] }), remindMin && (_jsxs("select", { value: remindMethod, onChange: e => setRemindMethod(e.target.value), className: input, children: [_jsx("option", { value: "browser", children: "Browser" }), _jsx("option", { value: "email", children: "Email" }), _jsx("option", { value: "both", children: "Both" })] }))] }), remindMin === 'custom' && (_jsx("div", { className: "mt-2", children: _jsx("input", { type: "number", min: 1, placeholder: "Minutes before event", value: customMin, onChange: e => setCustomMin(e.target.value), className: input }) }))] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx("button", { type: "submit", disabled: saving, className: "flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50", children: saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event' }), _jsx("button", { type: "button", onClick: () => navigate(-1), className: "px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50", children: "Cancel" })] })] })] }) }));
}
