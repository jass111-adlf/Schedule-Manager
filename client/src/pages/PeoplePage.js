import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { usersApi, friendsApi } from '../api';
// ── Pending friend requests ────────────────────────────────────
function RequestsPanel({ requests, onAccept, onDecline }) {
    if (requests.length === 0)
        return null;
    return (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2", children: "Pending requests" }), _jsx("div", { className: "space-y-2", children: requests.map(r => (_jsxs("div", { className: "bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between shadow-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: r.requester.name }), _jsx("p", { className: "text-xs text-gray-500", children: r.requester.email })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => onAccept(r.id), className: "text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700", children: "Accept" }), _jsx("button", { onClick: () => onDecline(r.id), className: "text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200", children: "Decline" })] })] }, r.id))) })] }));
}
// ── Friends list ──────────────────────────────────────────────
function FriendCard({ friend, onRemove, onViewProfile }) {
    return (_jsxs("div", { className: "bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: friend.name }), _jsx("p", { className: "text-xs text-gray-500", children: friend.email })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onViewProfile, className: "text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600", children: "View profile" }), _jsx("button", { onClick: onRemove, className: "text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200", children: "Remove" })] })] }));
}
// ── Search result card ────────────────────────────────────────
function SearchCard({ u, onAction, onViewProfile }) {
    async function sendRequest() { await friendsApi.sendRequest(u.id); onAction(); }
    async function remove() { if (u.friendshipId) {
        await friendsApi.remove(u.friendshipId);
        onAction();
    } }
    return (_jsxs("div", { className: "bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between shadow-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: u.name }), _jsx("p", { className: "text-xs text-gray-500", children: u.email })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: onViewProfile, className: "text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600", children: "View profile" }), u.friendshipStatus === 'accepted' ? (_jsx("button", { onClick: remove, className: "text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200", children: "Unfriend" })) : u.friendshipStatus === 'pending' && u.iRequested ? (_jsx("span", { className: "text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded", children: "Request sent" })) : u.friendshipStatus === 'pending' ? (_jsx("span", { className: "text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded", children: "Pending" })) : (_jsx("button", { onClick: sendRequest, className: "text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700", children: "Add friend" }))] })] }));
}
// ── People page ───────────────────────────────────────────────
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
    return (_jsx(Layout, { children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsx("h1", { className: "text-xl font-semibold text-gray-800 mb-4", children: "People" }), _jsx(RequestsPanel, { requests: requests, onAccept: acceptRequest, onDecline: declineRequest }), _jsxs("div", { className: "mb-6", children: [_jsxs("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2", children: ["Friends (", friends.length, ")"] }), friends.length === 0 ? (_jsx("p", { className: "text-sm text-gray-400", children: "No friends yet. Search for people to connect." })) : (_jsx("div", { className: "space-y-2", children: friends.map(f => (_jsx(FriendCard, { friend: f, onRemove: () => removeFriend(f.friendshipId), onViewProfile: () => viewProfile(f.id, f.name) }, f.id))) }))] }), _jsxs("div", { className: "flex gap-2 mb-4", children: [_jsx("input", { type: "text", placeholder: "Search by name or email\u2026", value: q, onChange: e => setQ(e.target.value), onKeyDown: e => e.key === 'Enter' && (e.preventDefault(), search()), className: "flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsx("button", { onClick: search, className: "px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700", children: "Search" })] }), searched && (_jsxs("div", { children: [_jsx("p", { className: "text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2", children: "Results" }), results.length === 0 ? (_jsx("p", { className: "text-sm text-gray-400", children: "No users found." })) : (_jsx("div", { className: "space-y-2", children: results.map(u => (_jsx(SearchCard, { u: u, onAction: () => { load(); search(); }, onViewProfile: () => viewProfile(u.id, u.name) }, u.id))) }))] }))] }) }));
}
