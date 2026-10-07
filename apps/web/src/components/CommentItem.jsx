import { useEffect, useRef, useState } from 'react';
import { getComments, createComment, deleteComment } from '../api/comments.js';

export default function CommentItem({ comment, postId, token, currentUser, onDeleted }) {
    const [open, setOpen] = useState(false);
    const [replies, setReplies] = useState([]);
    const [total, setTotal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const pending = useRef(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const deletePending = useRef(false);

    function author(record) {
        return record.creator_id === currentUser.id
            ? currentUser.name
            : `Member #${record.creator_id}`;
    }

    useEffect(() => {
        if (!open) return;

        const controller = new AbortController();

        async function load() {
            setLoading(true);
            setLoadError('');

            try {
                const result = await getComments(
                    token, postId, controller.signal, comment.id
                );

                if (!controller.signal.aborted) {
                    setReplies(result.data);
                    setTotal(result.pagination.total);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setLoadError(error.message || 'Unable to load replies');
                }
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }

        load();
        return () => controller.abort();
    }, [open, token, postId, comment.id]);

    async function remove() {
        if (deletePending.current || pending.current || saving) return;

        const confirmed = window.confirm(
            'Delete this comment? Its replies will also be hidden.'
        );
        if (!confirmed) return;

        deletePending.current = true;
        setDeleting(true);
        setDeleteError('');

        try {
            await deleteComment(token, postId, comment.id);
            onDeleted(comment.id);
        } catch (error) {
            setDeleteError(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm deletion. Refresh before retrying.'
                    : error.message
            );
        } finally {
            deletePending.current = false;
            setDeleting(false);
        }
    }

    async function submit(event) {
        event.preventDefault();

        const content = draft.trim();
        if (!content || pending.current || deletePending.current || loading || loadError) return;

        pending.current = true;
        setSaving(true);
        setSaveError('');

        try {
            const reply = await createComment(
                token, postId, content, comment.id
            );

            setReplies(previous => [reply, ...previous]);
            setTotal(previous => (previous ?? 0) + 1);
            setDraft('');
        } catch (error) {
            setSaveError(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm your reply. Reopen the thread before retrying.'
                    : error.message
            );
        } finally {
            pending.current = false;
            setSaving(false);
        }
    }

    return (
        <div className="wc-thread">
            <div className="wc-comment">
                <span className="wc-avatar small" aria-hidden="true">
                    {author(comment).slice(0, 2).toUpperCase()}
                </span>

                <div className="wc-thread-body">
                    <strong>{author(comment)}</strong>
                    <p>{comment.content}</p>

                    <span className="wc-comment-date">{comment.created_at}</span>
                    <button
                        type="button"
                        className="wc-reply-link"
                        aria-expanded={open}
                        aria-controls={`replies-${comment.id}`}
                        disabled={saving || deleting}
                        onClick={() => setOpen(value => !value)}
                    >
                        {open ? 'Hide replies'
                            : total === null ? 'Reply'
                                : `Reply · ${total}`}
                    </button>
                    {comment.creator_id === currentUser.id && (
                        <button
                            type="button"
                            className="wc-reply-link"
                            disabled={deleting || saving}
                            onClick={remove}
                        >
                            {deleting ? 'Deleting…' : 'Delete'}
                        </button>
                    )}

                    {deleteError && <p role="alert">{deleteError}</p>}
                </div>
            </div>

            {open && (
                <section id={`replies-${comment.id}`}
                    className="wc-replies" aria-label="Replies">
                    {loading && <p role="status">Loading replies…</p>}
                    {loadError && <p role="alert">{loadError}</p>}

                    {!loading && !loadError && (
                        <>
                            {replies.length === 0 && (
                                <p className="wc-reply-empty">Continue the conversation.</p>
                            )}

                            {replies.map(reply => (
                                <div className="wc-comment" key={reply.id}>
                                    <span className="wc-avatar small" aria-hidden="true">
                                        {author(reply).slice(0, 2).toUpperCase()}
                                    </span>
                                    <div>
                                        <strong>{author(reply)}</strong>
                                        <p>{reply.content}</p>
                                    </div>
                                </div>
                            ))}

                            {total > replies.length && (
                                <p className="wc-reply-empty">
                                    Showing {replies.length} of {total} replies.
                                </p>
                            )}
                        </>
                    )}

                    {saveError && <p role="alert">{saveError}</p>}

                    <form className="wc-comment-form" onSubmit={submit}>
                        <input
                            aria-label={`Reply to ${author(comment)}`}
                            placeholder={`Reply to ${author(comment)}…`}
                            value={draft}
                            onChange={event => setDraft(event.target.value)}
                            maxLength={2000}
                            disabled={saving}
                            required
                        />
                        <button type="submit"
                            disabled={!draft.trim() || saving || deleting || loading || Boolean(loadError)}>
                            {saving ? '…' : 'Reply'}
                        </button>
                    </form>
                </section>
            )}
        </div>
    );
}