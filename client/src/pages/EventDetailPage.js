import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { eventsApi, invitationsApi, usersApi } from '../api';
import { useAuth } from '../auth';
const STATUS_BADGE = {
    upcoming: 'bg-coral-tint text-coral-dark',
    completed: 'bg-warm-card text-ink-muted',
    cancelled: 'bg-warm-border text-ink-muted',
};
const fmtDt = (iso) => new Date(iso).toLocaleString('default', { dateStyle: 'medium', timeStyle: 'short' });
export default function EventDetailPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchEmail, setSearchEmail] = useState('');
    const [results, setResults] = useState([]);
    const [inviteMsg, setInviteMsg] = useState('');
    useEffect(() => {
        eventsApi.get(id)
            .then(r => setEvent(r.data.data.event))
            .catch(() => navigate('/calendar'))
            .finally(() => setLoading(false));
    }, [id, navigate]);
    if (loading)
        return _jsx(Layout, { children: _jsx("div", { className: "text-sm text-ink-muted py-10 text-center", children: "Loading\u2026" }) });
    if (!event)
        return null;
    const isOwner = event.createdBy === user?.id;
    const myInvite = event.invitations?.find((i) => i.invitedUserId === user?.id);
    const notCancelled = event.status !== 'cancelled';
    async function handleCancel() {
        if (!confirm('Cancel this event for everyone?'))
            return;
        await eventsApi.cancel(id);
        navigate('/calendar');
    }
    async function handleDelete() {
        if (!confirm('Permanently delete this event?'))
            return;
        await eventsApi.delete(id);
        navigate('/calendar');
    }
    async function searchUsers() {
        if (searchEmail.trim().length < 2)
            return;
        const r = await usersApi.search(searchEmail.trim());
        setResults(r.data.data.users);
    }
    async function invite(userId) {
        try {
            await eventsApi.invite(id, userId);
            setInviteMsg('Invited!');
            setResults([]);
            setSearchEmail('');
            const r = await eventsApi.get(id);
            setEvent(r.data.data.event);
        }
        catch (err) {
            setInviteMsg(err?.response?.data?.message ?? 'Failed to invite');
        }
    }
    async function respond(action) {
        action === 'accept'
            ? await invitationsApi.accept(myInvite.id)
            : await invitationsApi.decline(myInvite.id);
        navigate('/');
    }
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-xl mx-auto", children: [_jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold text-ink", children: event.title }), _jsx("span", { className: `mt-1 inline-block text-xs px-2 py-0.5 rounded-pill font-medium ${STATUS_BADGE[event.status] ?? 'bg-warm-card text-ink-muted'}`, children: event.status })] }), isOwner && notCancelled && (_jsxs("div", { className: "flex gap-2 flex-wrap justify-end", children: [_jsx("button", { onClick: () => navigate(`/events/${id}/edit`), className: "text-sm px-3 py-1.5 border border-warm-border rounded-pill hover:bg-warm-card text-ink transition-colors", children: "Edit" }), _jsx("button", { onClick: handleCancel, className: "text-sm px-3 py-1.5 border border-coral-soft text-coral-dark rounded-pill hover:bg-coral-tint transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleDelete, className: "text-sm px-3 py-1.5 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "Delete" })] }))] }), _jsxs("div", { className: "bg-white rounded-container border border-warm-border p-6 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Start" }), _jsx("p", { className: "text-ink", children: event.allDay ? 'All day' : fmtDt(event.startDatetime ?? event.start) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "End" }), _jsx("p", { className: "text-ink", children: event.allDay ? '—' : fmtDt(event.endDatetime ?? event.end) })] }), event.location && (_jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Location" }), _jsx("p", { className: "text-ink", children: event.location })] })), event.recurrenceType !== 'none' && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-ink-muted mb-0.5", children: "Repeats" }), _jsxs("p", { className: "text-ink capitalize", children: [event.recurrenceType, " until ", event.repeatUntil?.slice(0, 10)] })] }))] }), event.description && (_jsxs("div", { className: "pt-2 border-t border-warm-border", children: [_jsx("p", { className: "text-xs text-ink-muted mb-1", children: "Description" }), _jsx("p", { className: "text-sm text-ink whitespace-pre-wrap", children: event.description })] })), myInvite?.invitationStatus === 'pending' && (_jsxs("div", { className: "pt-2 border-t border-warm-border", children: [_jsx("p", { className: "text-sm text-ink-muted mb-2", children: "You've been invited to this event." }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => respond('accept'), className: "text-sm px-4 py-1.5 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors", children: "Accept" }), _jsx("button", { onClick: () => respond('decline'), className: "text-sm px-4 py-1.5 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "Decline" })] })] })), isOwner && notCancelled && (_jsxs("div", { className: "pt-2 border-t border-warm-border", children: [_jsx("p", { className: "text-[13px] font-semibold text-coral-dark mb-2", children: "Invite people" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "email", placeholder: "Search by email", value: searchEmail, onChange: e => { setSearchEmail(e.target.value); setInviteMsg(''); }, onKeyDown: e => e.key === 'Enter' && (e.preventDefault(), searchUsers()), className: "flex-1 border border-warm-border rounded-[10px] px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-coral transition-colors" }), _jsx("button", { onClick: searchUsers, className: "text-sm px-3 py-1.5 bg-warm-card rounded-pill hover:bg-warm-border text-ink transition-colors", children: "Search" })] }), inviteMsg && _jsx("p", { className: "text-xs mt-1 text-coral-dark", children: inviteMsg }), results.length > 0 && (_jsx("div", { className: "mt-2 border border-warm-border rounded-card overflow-hidden", children: results.map(u => (_jsxs("div", { className: "flex items-center justify-between px-3 py-2 hover:bg-coral-tint transition-colors", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-ink", children: u.name }), _jsx("p", { className: "text-xs text-ink-muted", children: u.email })] }), _jsx("button", { onClick: () => invite(u.id), className: "text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors", children: "Invite" })] }, u.id))) })), event.invitations?.length > 0 && (_jsxs("div", { className: "mt-3", children: [_jsx("p", { className: "text-xs text-ink-muted mb-1", children: "Invited" }), event.invitations.map((inv) => (_jsxs("div", { className: "flex items-center justify-between py-1 text-sm", children: [_jsxs("span", { className: "text-ink", children: [inv.invitedUser.name, " ", _jsxs("span", { className: "text-ink-muted text-xs", children: ["(", inv.invitedUser.email, ")"] })] }), _jsx("span", { className: `text-xs px-2 py-0.5 rounded-pill ${inv.invitationStatus === 'accepted' ? 'bg-coral-tint text-coral-dark' : inv.invitationStatus === 'declined' ? 'bg-warm-border text-ink-muted' : 'bg-coral-soft text-coral-dark'}`, children: inv.invitationStatus })] }, inv.id)))] }))] }))] }), _jsx("button", { onClick: () => navigate(-1), className: "mt-4 text-sm text-ink-muted hover:text-ink transition-colors", children: "\u2190 Back" })] }) }));
}
