import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi, friendsApi } from '../api';
function Avatar({ name }) {
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (_jsx("span", { className: "w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-coral-dark flex-shrink-0", style: { backgroundColor: '#f5c4b3' }, children: initials }));
}
function RequestsPanel({ requests, onAccept, onDecline }) {
    if (requests.length === 0)
        return null;
    return (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "text-[13px] font-semibold text-coral-dark mb-2", children: "Pending requests" }), _jsx("div", { className: "space-y-2", children: requests.map(r => (_jsxs("div", { className: "bg-white rounded-container p-3 flex items-center justify-between border border-warm-border", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: r.requester.name }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-ink", children: r.requester.name }), _jsx("p", { className: "text-xs text-ink-muted", children: r.requester.email })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => onAccept(r.id), className: "text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors", children: "Accept" }), _jsx("button", { onClick: () => onDecline(r.id), className: "text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "Decline" })] })] }, r.id))) })] }));
}
function FriendCard({ friend, onRemove, onViewProfile }) {
    return (_jsxs("div", { className: "bg-white rounded-container p-4 flex items-center justify-between border border-warm-border", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: friend.name }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-ink", children: friend.name }), _jsx("p", { className: "text-xs text-ink-muted", children: friend.email })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onViewProfile, className: "text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "View profile" }), _jsx("button", { onClick: onRemove, className: "text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill hover:bg-warm-border transition-colors", children: "Remove" })] })] }));
}
function SearchCard({ u, onAction, onViewProfile }) {
    async function sendRequest() { await friendsApi.sendRequest(u.id); onAction(); }
    async function remove() { if (u.friendshipId) {
        await friendsApi.remove(u.friendshipId);
        onAction();
    } }
    return (_jsxs("div", { className: "bg-white rounded-container p-4 flex items-center justify-between border border-warm-border", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Avatar, { name: u.name }), _jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-ink", children: u.name }), _jsx("p", { className: "text-xs text-ink-muted", children: u.email })] })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onViewProfile, className: "text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill hover:bg-coral-soft transition-colors", children: "View profile" }), u.friendshipStatus === 'accepted' ? (_jsx("button", { onClick: remove, className: "text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill hover:bg-warm-border transition-colors", children: "Unfriend" })) : u.friendshipStatus === 'pending' && u.iRequested ? (_jsx("span", { className: "text-xs px-3 py-1 bg-warm-card text-ink-muted rounded-pill", children: "Sent" })) : u.friendshipStatus === 'pending' ? (_jsx("span", { className: "text-xs px-3 py-1 bg-coral-tint text-coral-dark rounded-pill", children: "Pending" })) : (_jsx("button", { onClick: sendRequest, className: "text-xs px-3 py-1 bg-coral text-white rounded-pill hover:bg-coral-hover transition-colors", children: "Add" }))] })] }));
}
export default function PeoplePage() {
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [searched, setSearched] = useState(false);
    async function load() {
        const [fr, rq] = await Promise.all([friendsApi.list(), friendsApi.requests()]);
        setFriends(fr.data.data.friends);
        setRequests(rq.data.data.requests);
    }
    useEffect(() => { load(); }, []);
    async function search() {
        if (q.trim().length < 2)
            return;
        const r = await usersApi.search(q.trim());
        setResults(r.data.data.users);
        setSearched(true);
    }
    async function acceptRequest(id) { await friendsApi.accept(id); load(); setResults([]); setSearched(false); }
    async function declineRequest(id) { await friendsApi.remove(id); load(); }
    async function removeFriend(friendshipId) { await friendsApi.remove(friendshipId); load(); }
    function viewProfile(userId, userName) {
        navigate(`/people/${userId}`, { state: { name: userName } });
    }
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold text-ink mb-5", children: "People" }), _jsx(RequestsPanel, { requests: requests, onAccept: acceptRequest, onDecline: declineRequest }), _jsxs("div", { className: "mb-6", children: [_jsxs("p", { className: "text-[13px] font-semibold text-coral-dark mb-2", children: ["Friends ", friends.length > 0 && `(${friends.length})`] }), friends.length === 0 ? (_jsx("p", { className: "text-sm text-ink-muted", children: "No friends yet. Search for people to connect." })) : (_jsx("div", { className: "space-y-2", children: friends.map(f => (_jsx(FriendCard, { friend: f, onRemove: () => removeFriend(f.friendshipId), onViewProfile: () => viewProfile(f.id, f.name) }, f.id))) }))] }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("input", { type: "text", placeholder: "Search by name or email\u2026", value: q, onChange: e => setQ(e.target.value), onKeyDown: e => e.key === 'Enter' && (e.preventDefault(), search()), className: "flex-1 border border-warm-border rounded-[10px] px-3 py-2 text-sm text-ink focus:outline-none focus:border-coral transition-colors" }), _jsx("button", { onClick: search, className: "px-4 py-2 bg-coral text-white text-sm rounded-pill hover:bg-coral-hover transition-colors", children: "Search" })] }), searched && (_jsxs("div", { children: [_jsx("p", { className: "text-[13px] font-semibold text-coral-dark mb-2", children: "Results" }), results.length === 0 ? (_jsx("p", { className: "text-sm text-ink-muted", children: "No users found." })) : (_jsx("div", { className: "space-y-2", children: results.map(u => (_jsx(SearchCard, { u: u, onAction: () => { load(); search(); }, onViewProfile: () => viewProfile(u.id, u.name) }, u.id))) }))] }))] }) }));
}
