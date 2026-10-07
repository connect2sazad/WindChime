import { Avatar } from './FeedVisuals.jsx';
import PostMediaView from './PostMediaView.jsx';
import ReactionIcon from './ReactionIcon.jsx';
import RelativeTime from './RelativeTime.jsx';
import ReactionsDialog from './ReactionsDialog.jsx';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getComments, getCommentSummary, createComment, deleteComment } from '../api/comments.js';
import CommentItem from './CommentItem.jsx';

export default function CommentsPanel({ post, token, currentUser, onClose, onCountChange, reactionSummary }) {
    const dialog = useRef(null);
    const input = useRef(null);
    const pending = useRef(false);
    const [comments, setComments] = useState([]);
    const [summary, setSummary] = useState({ total: 0, reply_counts: {} });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [draft, setDraft] = useState('');
    const [target, setTarget] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [version, setVersion] = useState(0);
    const [reactorsOpen, setReactorsOpen] = useState(false);
    const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width:767px)').matches);
    useEffect(()=>{const query=window.matchMedia('(max-width:767px)');const update=event=>setMobile(event.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);

    useEffect(() => {
        const element = dialog.current;
        const focused = document.activeElement;
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        element.showModal();
        return () => {
            element.close();
            document.body.style.overflow = overflow;
            if (focused?.isConnected) focused.focus();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const [list, counts] = await Promise.all([
                    getComments(token, post.id, controller.signal),
                    getCommentSummary(token, post.id, controller.signal),
                ]);
                if (!controller.signal.aborted) {
                    setComments(list.data);
                    setHasMore(list.pagination.has_next_page);
                    setSummary(counts);
                    onCountChange(counts.total);
                }
            } catch (e) { if (!controller.signal.aborted) setError(e.message); }
            finally { if (!controller.signal.aborted) setLoading(false); }
        }
        load();
        return () => controller.abort();
    }, [token, post.id, onCountChange]);

    async function refreshSummary() {
        const counts = await getCommentSummary(token, post.id);
        setSummary(counts);
        onCountChange(counts.total);
        setVersion(value => value + 1);
    }

    async function more() {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            const result = await getComments(token, post.id, undefined, null, page + 1);
            setComments(previous => [...previous, ...result.data.filter(row => !previous.some(item => item.id === row.id))]);
            setPage(value => value + 1);
            setHasMore(result.pagination.has_next_page);
        } catch (e) { setError(e.message); }
        finally { pending.current = false; setBusy(false); }
    }

    async function submit(event) {
        event.preventDefault();
        const content = draft.trim();
        if (!content || pending.current || loading) return;
        pending.current = true;
        setBusy(true);
        setError('');
        let saved = false;
        try {
            const comment = await createComment(token, post.id, content, target?.parentId ?? null);
            saved = true;
            if (!target) setComments(previous => [comment, ...previous]);
            setDraft('');
            setTarget(null);
            await refreshSummary();
        } catch (e) {
            setError(saved ? 'Saved. Reopen comments to refresh the latest count.'
                : e instanceof TypeError || e.name === 'TimeoutError'
                    ? 'Could not confirm your comment. Reopen this panel before retrying.' : e.message);
        } finally { pending.current = false; setBusy(false); }
    }

    async function remove(record) {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        let removed = false;
        try {
            await deleteComment(token, post.id, record.id);
            removed = true;
            if (record.parent_id === null) setComments(previous => previous.filter(item => item.id !== record.id));
            if (target?.parentId === record.id) setTarget(null);
            await refreshSummary();
        } catch (e) { setError(removed ? 'Deleted. Reopen comments to refresh the count.' : e.message); }
        finally { pending.current = false; setBusy(false); }
    }

    function reply(value) {
        setTarget(value);
        requestAnimationFrame(() => input.current?.focus());
    }

    return createPortal(
        <dialog ref={dialog} className="wc-comment-dialog" aria-labelledby={`comments-title-${post.id}`}
            onCancel={event => { event.preventDefault(); onClose(); }}
            onClick={event => {
                if (event.target === event.currentTarget) {
                    const rect = event.currentTarget.getBoundingClientRect();
                    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
                }
            }}>
            {!mobile && <section className="wc-dialog-post-side" aria-label="Original post">
                <div className="wc-split-author">
                    <Avatar name={post.name} id={post.creator_id} token={token}/>
                    <div><strong>{post.name}</strong><p>@{post.username} · <RelativeTime value={post.created_at} /></p></div>
                </div>
                <div className="wc-split-content"><PostMediaView post={post} token={token}/><span>A SHARED MOMENT</span><p>{post.content}</p></div>
                <footer className="wc-split-footer">
                    <button type="button" className="wc-reaction-details" onClick={() => setReactorsOpen(true)} aria-label="See who reacted to this post">
                        <span className="wc-reaction-inline" aria-hidden="true"><ReactionIcon name="like" size={18} colored /><ReactionIcon name="love" size={18} colored /></span> {reactionSummary?.total || 0} reactions <span aria-hidden="true">›</span>
                    </button>
                    <span>{summary.total} comments</span>
                </footer>
            </section>}
            <div className="wc-dialog-comments-side">
            <header className="wc-dialog-header">
                <span className="wc-dialog-grip" aria-hidden="true" />
                <div><h2 id={`comments-title-${post.id}`}>Comments</h2><span>{loading ? 'Loading…' : `${summary.total} total · includes replies`}</span></div>
                <button type="button" aria-label="Close comments" onClick={onClose}>×</button>
            </header>
            <div className="wc-dialog-scroll">
                {mobile && <div className="wc-mobile-post-context"><strong>{post.name}</strong><PostMediaView post={post} token={token}/><p>{post.content}</p></div>}

                {loading && <p className="wc-ig-status" role="status">Loading comments…</p>}
                {error && <p className="wc-ig-status" role="alert">{error}</p>}
                {!loading && comments.length === 0 && <div className="wc-comment-empty"><h3>No comments yet</h3><p>Start the conversation.</p></div>}
                {comments.map(comment => <CommentItem key={comment.id} comment={comment} postId={post.id}
                    token={token} currentUser={currentUser} replyCount={summary.reply_counts[comment.id] || 0}
                    onReply={reply} onDelete={remove} version={version} busy={busy} />)}
                {hasMore && <button type="button" className="wc-ig-load-more" disabled={busy} onClick={more}>{busy ? 'Loading…' : 'View more comments'}</button>}
            </div>
            <footer className="wc-dialog-composer">
                {target && <div className="wc-reply-target"><span>Replying to <strong>{target.name}</strong></span><button type="button" disabled={busy} aria-label="Cancel reply" onClick={() => setTarget(null)}>×</button></div>}
                <form onSubmit={submit}>
                    <Avatar name={currentUser.name} id={currentUser.id} token={token} version={currentUser.avatar_version} small/>
                    <textarea ref={input} aria-label={target ? 'Write a reply' : 'Write a comment'} placeholder={target ? 'Add a reply…' : 'Add a comment…'}
                        value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} rows={1} disabled={busy}
                        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} />
                    <button type="submit" disabled={!draft.trim() || busy || loading}>{busy ? 'Posting…' : 'Post'}</button>
                </form>
            </footer>
            </div>
            {reactorsOpen && <ReactionsDialog token={token} postId={post.id} onClose={() => setReactorsOpen(false)} />}
        </dialog>, document.body
    );
}
