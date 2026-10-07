import CommentReactionControl from './CommentReactionControl.jsx';
import ReactionsDialog from './ReactionsDialog.jsx';
import CommentOptions from './CommentOptions.jsx';
import { useEffect, useRef, useState } from 'react';
import RelativeTime from './RelativeTime.jsx';
import { getComments } from '../api/comments.js';

function nameOf(record, user) {
    return record.creator_id === user.id ? user.name : `Member #${record.creator_id}`;
}
function CommentRow({ record, currentUser, onReply, onDelete, busy, postId, token }) {
    const [reactorsOpen, setReactorsOpen] = useState(false);
    const name = nameOf(record, currentUser);
    return (
        <div className="wc-ig-row">
            <span className="wc-avatar small" aria-hidden="true">{name.slice(0,2).toUpperCase()}</span>
            <div className="wc-ig-body">
                <p><strong>{name}</strong> <span>{record.content}</span></p>
                <div className="wc-ig-meta">
                    <RelativeTime value={record.created_at} />
                    <button type="button" disabled={busy} onClick={()=>onReply(record)}>Reply</button>
                    <CommentOptions disabled={busy} isReply={Boolean(record.parent_id)}
                        onViewReactions={()=>setReactorsOpen(true)}
                        onDelete={record.creator_id===currentUser.id?()=>onDelete(record):undefined} />
                </div>
            </div>
            <CommentReactionControl token={token} postId={postId} commentId={record.id} disabled={busy} />
            {reactorsOpen && <ReactionsDialog token={token} postId={postId} commentId={record.id} onClose={()=>setReactorsOpen(false)} />}
        </div>
    );
}

export default function CommentItem({ comment, postId, token, currentUser, replyCount = 0, onReply, onDelete, version, busy }) {
    const [open, setOpen] = useState(false);
    const [replies, setReplies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const pending = useRef(false);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        async function load() {
            setLoading(true);
            setError('');
            try {
                const result = await getComments(token, postId, controller.signal, comment.id);
                if (!controller.signal.aborted) {
                    setReplies(result.data);
                    setPage(1);
                    setHasMore(result.pagination.has_next_page);
                }
            } catch (e) { if (!controller.signal.aborted) setError(e.message); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load();
        return () => controller.abort();
    }, [open, token, postId, comment.id, version]);

    async function more() {
        if (pending.current || loading) return;
        pending.current = true;
        setLoading(true);
        setError('');
        try {
            const result = await getComments(token, postId, undefined, comment.id, page + 1);
            setReplies(previous => [...previous, ...result.data.filter(row => !previous.some(item => item.id === row.id))]);
            setPage(value => value + 1);
            setHasMore(result.pagination.has_next_page);
        } catch (e) { setError(e.message); }
        finally { pending.current = false; setLoading(false); }
    }

    function reply(record) {
        setOpen(true);
        onReply({ parentId: comment.id, name: nameOf(record, currentUser) });
    }
    return (
        <div className="wc-ig-thread">
            <CommentRow record={comment} currentUser={currentUser} onReply={reply} onDelete={onDelete} busy={busy} postId={postId} token={token} />
            {(replyCount > 0 || open) && (
                <button type="button" className="wc-ig-view-replies" aria-expanded={open}
                    onClick={() => setOpen(value => !value)}>
                    <span aria-hidden="true" />{open ? 'Hide replies' : `View replies (${replyCount})`}
                </button>
            )}
            {open && (
                <div className="wc-ig-replies">
                    {replies.map(record => <CommentRow key={record.id} record={record} currentUser={currentUser}
                        onReply={reply} onDelete={onDelete} busy={busy} postId={postId} token={token} />)}
                    {loading && <p className="wc-ig-status" role="status">Loading replies…</p>}
                    {error && <p className="wc-ig-status" role="alert">{error}</p>}
                    {!loading && hasMore && <button className="wc-ig-view-replies" type="button" onClick={more}>View more replies</button>}
                </div>
            )}
        </div>
    );
}
