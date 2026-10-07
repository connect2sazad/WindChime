import { Avatar } from './FeedVisuals.jsx';
import ReactionIcon from './ReactionIcon.jsx';
import { REACTIONS } from '../utils/reactionTypes.js';
import { getCommentReactors, getCommentReaction } from '../api/comments.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getReactors, getReactionSummary } from '../api/reactions.js';
import { getDisplayUser } from '../api/users.js';
const TYPES = REACTIONS.map(item => [item.type, item.icon, item.label]);

export default function ReactionsDialog({ token, postId, commentId = null, onClose }) {
    const dialog = useRef(null);
    const pending = useRef(false);
    const [type, setType] = useState(null);
    const [rows, setRows] = useState([]);
    const [counts, setCounts] = useState({ total: 0, counts: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    useEffect(() => {
        const element = dialog.current;
        const focus = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        element.showModal();
        return () => { element.close(); document.body.style.overflow = overflow; if (focus?.isConnected) focus.focus(); };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            setLoading(true); setError(''); setRows([]);
            try {
                const [list, summary] = await Promise.all([
                    commentId ? getCommentReactors(token, postId, commentId, type, 1, controller.signal) : getReactors(token, postId, type, 1, controller.signal),
                    commentId ? getCommentReaction(token, postId, commentId, controller.signal) : getReactionSummary(token, postId, controller.signal),
                ]);
                const users = await Promise.all(list.data.map(async row => ({...row, user: await getDisplayUser(token, row.creator_id, controller.signal)})));
                if (!controller.signal.aborted) {
                    setRows(users); setCounts(summary); setPage(1); setHasMore(list.pagination.has_next_page);
                }
            } catch (e) { if (!controller.signal.aborted) setError(e.message); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load(); return () => controller.abort();
    }, [token, postId, commentId, type]);

    async function more() {
        if (pending.current || loading) return;
        pending.current = true; setLoading(true); setError('');
        try {
            const list = await (commentId ? getCommentReactors(token, postId, commentId, type, page+1) : getReactors(token, postId, type, page+1));
            const users = await Promise.all(list.data.map(async row => ({...row, user: await getDisplayUser(token, row.creator_id)})));
            setRows(previous => [...previous, ...users.filter(row => !previous.some(item => item.id === row.id))]);
            setPage(value => value+1); setHasMore(list.pagination.has_next_page);
        } catch (e) { setError(e.message); }
        finally { pending.current=false; setLoading(false); }
    }
    return createPortal(
        <dialog ref={dialog} className="wc-reactors-dialog" aria-label="People who reacted"
            onCancel={event => {event.preventDefault();onClose();}}>
            <header className="wc-dialog-header"><h2>Reactions</h2><button type="button" aria-label="Close reactions" onClick={onClose}>×</button></header>
            <div className="wc-reactor-tabs" role="group" aria-label="Filter by reaction">
                <button type="button" aria-pressed={type===null} disabled={loading} onClick={()=>setType(null)}>All <span>{counts.total}</span></button>
                {TYPES.map(([value,icon,label])=><button key={value} type="button" aria-label={`${label}, ${counts.counts[value]||0}`}
                    title={label} aria-pressed={type===value} disabled={loading} onClick={()=>setType(value)}><ReactionIcon name={icon} size={22} colored /> <span>{counts.counts[value]||0}</span></button>)}
            </div>
            <div className="wc-reactor-list">
                {error&&<p role="alert">{error}</p>}
                {!error&&rows.map(row=><div className="wc-reactor-row" key={row.id}>
                    <Avatar name={row.user.name} id={row.creator_id} token={token} small/>
                    <div><strong>{row.user.name}</strong>{row.user.username&&<p>@{row.user.username}</p>}</div>
                    <span className="wc-reactor-type" title={row.type}><ReactionIcon name={row.type} size={24} colored /></span>
                </div>)}
                {loading&&<p role="status">Loading reactions…</p>}
                {!loading&&!error&&rows.length===0&&<p>No {type||''} reactions yet.</p>}
                {!loading&&hasMore&&<button className="wc-ig-load-more" type="button" onClick={more}>View more people</button>}
            </div>
        </dialog>, document.body
    );
}
