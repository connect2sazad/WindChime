import ProfileLink from '../../profiles/ProfileLink.js';
import PostOptions from './PostOptions.jsx';
import SharePostDialog from './SharePostDialog.jsx';
import Icon from '../../../shared/components/Icon.jsx';
import Avatar from '../../profiles/Avatar.js';

import PostMediaView from '../Media.js';
import ReactionIcon from '../../reactions/Icon.js';
import { REACTIONS } from '../../reactions/types.js';
import ReactionsDialog from '../../reactions/Dialog.js';
import RelativeTime from '../../../shared/components/RelativeTime.jsx';
import { useEffect, useRef, useState } from 'react';

import { getReactionSummary, setReaction, removeReaction } from '../../reactions/api/index.js';
import { getRepostSummary, addRepost, undoRepost } from '../api/index.js';
import { getCommentSummary } from '../../comments/api/index.js';
import CommentsPanel from '../../comments/index.js';

// Displays one post and coordinates its reactions, comments, reposts, and edit actions.
export default function PostCard({ post, currentUser, token, onUpdated, onDeleted }) {
    const [reaction, setMyReaction] = useState(null);
    const [reactionLoading, setReactionLoading] = useState(true);
    const [reactionBusy, setReactionBusy] = useState(false);
    const [reactionError, setReactionError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [reactorsOpen, setReactorsOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const reactionControl = useRef(null);
    const holdTimer = useRef(null);
    const held = useRef(false);
    const pointerStart = useRef(null);
    const mutationPending = useRef(false);
    const [summary, setSummary] = useState({
        counts: { like: 0, love: 0, laugh: 0, sad: 0, angry: 0 },
        total: 0,
    });
    const [repost, setRepost] = useState({ total: 0, reposted: false });
    const [repostLoading, setRepostLoading] = useState(true);
    const [repostBusy, setRepostBusy] = useState(false);
    const [repostError, setRepostError] = useState('');
    const repostPending = useRef(false);

    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState('');
    const [commentTotal, setCommentTotal] = useState(null);

    useEffect(() => {
        if (!pickerOpen) return;
        function dismiss(event) {
            if (!reactionControl.current?.contains(event.target)) setPickerOpen(false);
        }
        function escape(event) {
            if (event.key === 'Escape') {
                setPickerOpen(false);
                reactionControl.current?.querySelector('button')?.focus();
            }
        }
        document.addEventListener('pointerdown', dismiss);
        document.addEventListener('keydown', escape);
        return () => {
            document.removeEventListener('pointerdown', dismiss);
            document.removeEventListener('keydown', escape);
        };
    }, [pickerOpen]);

    const characters = Array.from(post.content || '');
    const longText = characters.length > 280;
    const preview = longText ? characters.slice(0, 280).join('').trimEnd() + '…' : post.content;
    const selectedReaction = REACTIONS.find((item) => item.type === reaction?.type);

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setRepostLoading(true);
            setRepostError('');

            try {
                const result = await getRepostSummary(token, post.id, controller.signal);
                if (!controller.signal.aborted) setRepost(result);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setRepostError(error.message || 'Unable to load reposts');
                }
            } finally {
                if (!controller.signal.aborted) setRepostLoading(false);
            }
        }

        load();
        return () => controller.abort();
    }, [token, post.id]);

    useEffect(() => {
        const controller = new AbortController();

        // Refresh the current viewer’s reaction whenever this post changes.
        async function loadReaction() {
            setReactionLoading(true);
            setReactionError('');

            try {
                const saved = await getReactionSummary(token, post.id, controller.signal);

                if (!controller.signal.aborted) {
                    setMyReaction(saved.my_reaction);
                    setSummary({
                        counts: saved.counts,
                        total: saved.total,
                    });
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setReactionError(error.message || 'Unable to load reaction');
                }
            } finally {
                if (!controller.signal.aborted) setReactionLoading(false);
            }
        }

        loadReaction();
        return () => controller.abort();
    }, [token, post.id]);

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setCommentsLoading(true);
            setCommentsError('');

            try {
                const result = await getCommentSummary(token, post.id, controller.signal);

                if (!controller.signal.aborted) {
                    setCommentTotal(result.total);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setCommentsError(error.message || 'Unable to load comments');
                }
            } finally {
                if (!controller.signal.aborted) setCommentsLoading(false);
            }
        }

        load();
        return () => controller.abort();
    }, [token, post.id]);

    async function chooseReaction(type) {
        if (reactionLoading || reactionBusy || reactionError || mutationPending.current) return;
        mutationPending.current = true;

        setReactionBusy(true);
        setPickerOpen(false);

        try {
            await setReaction(token, post.id, type);

            const saved = await getReactionSummary(token, post.id, AbortSignal.timeout(10000));

            setMyReaction(saved.my_reaction);
            setSummary({
                counts: saved.counts,
                total: saved.total,
            });
        } catch {
            setReactionError('Could not confirm the latest reactions. Reload before retrying.');
        } finally {
            mutationPending.current = false;
            setReactionBusy(false);
        }
    }

    async function clearReaction() {
        if (
            reactionLoading ||
            reactionBusy ||
            reactionError ||
            !reaction ||
            mutationPending.current
        )
            return;
        mutationPending.current = true;

        setReactionBusy(true);
        setPickerOpen(false);

        try {
            await removeReaction(token, post.id);

            const saved = await getReactionSummary(token, post.id, AbortSignal.timeout(10000));

            setMyReaction(saved.my_reaction);
            setSummary({ counts: saved.counts, total: saved.total });
        } catch {
            setReactionError('Could not confirm removal. Reload before retrying.');
        } finally {
            mutationPending.current = false;
            setReactionBusy(false);
        }
    }

    function stopHold() {
        clearTimeout(holdTimer.current);
        holdTimer.current = null;
    }

    // Long-press opens reactions on touch; movement cancels it so swipes still work.
    function startHold(event) {
        if (
            !event.isPrimary ||
            event.button !== 0 ||
            reactionBusy ||
            reactionLoading ||
            reactionError
        )
            return;
        stopHold();
        held.current = false;
        pointerStart.current = { x: event.clientX, y: event.clientY };
        holdTimer.current = setTimeout(() => {
            held.current = true;
            setPickerOpen(true);
        }, 450);
    }

    function moveHold(event) {
        const start = pointerStart.current;
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
            stopHold();
            held.current = true;
        }
    }

    function clickReaction() {
        stopHold();
        if (held.current) {
            held.current = false;
            return;
        }
        if (pickerOpen) {
            setPickerOpen(false);
            return;
        }
        if (reaction) clearReaction();
        else chooseReaction('like');
    }

    useEffect(() => () => clearTimeout(holdTimer.current), []);

    async function toggleRepost() {
        if (repostLoading || repostPending.current || repostError) return;

        repostPending.current = true;
        setRepostBusy(true);

        try {
            if (repost.reposted) {
                await undoRepost(token, post.id);
            } else {
                await addRepost(token, post.id);
            }

            const result = await getRepostSummary(token, post.id, AbortSignal.timeout(10000));

            setRepost(result);
        } catch {
            setRepostError('Could not confirm repost status. Reload before retrying.');
        } finally {
            repostPending.current = false;
            setRepostBusy(false);
        }
    }

    return (
        <article className="wc-post">
            <header className="wc-post-header">
                <Avatar name={post.name} tone={post.tone} id={post.creator_id} token={token} />
                <div>
                    <ProfileLink className="wc-author-link" username={post.username}>
                        <strong>{post.name}</strong>
                    </ProfileLink>
                    <p>
                        {post.username ? `@${post.username}` : 'Account unavailable'}{' '}
                        <span>
                            · <RelativeTime value={post.created_at} />
                        </span>
                    </p>
                </div>
                <PostOptions
                    post={post}
                    currentUser={currentUser}
                    token={token}
                    onSaved={onUpdated}
                    onDeleted={onDeleted}
                    onSeeAllReactions={setReactorsOpen}
                />
            </header>

            <div className="wc-post-content">
                <span className="wc-topic">
                    {post.kind === 'reel' ? 'REEL' : post.topic || 'A SHARED MOMENT'}
                </span>
                <PostMediaView post={post} token={token} />
                {post.content && <p>{preview}</p>}
                {longText && (
                    <button
                        type="button"
                        className="wc-view-more"
                        onClick={() => setExpanded(true)}
                    >
                        View more
                    </button>
                )}
            </div>

            <footer className="wc-post-actions">
                <div className="wc-reaction-control" ref={reactionControl}>
                    <button
                        aria-expanded={pickerOpen}
                        aria-controls={`reaction-picker-${post.id}`}
                        disabled={reactionLoading || reactionBusy || Boolean(reactionError)}
                        className={reaction ? 'is-liked' : ''}
                        onPointerDown={startHold}
                        onPointerMove={moveHold}
                        onPointerUp={stopHold}
                        onPointerCancel={() => {
                            stopHold();
                            held.current = true;
                        }}
                        onPointerLeave={stopHold}
                        onContextMenu={(event) => event.preventDefault()}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setPickerOpen(true);
                                requestAnimationFrame(() =>
                                    reactionControl.current
                                        ?.querySelector('.wc-reaction-options button')
                                        ?.focus(),
                                );
                            }
                        }}
                        title="Click to like or remove your reaction. Hold to choose."
                        aria-label={
                            reaction
                                ? 'Remove your reaction; hold or press Down Arrow to choose another'
                                : 'Like this post; hold or press Down Arrow to choose a reaction'
                        }
                        onClick={clickReaction}
                    >
                        <span aria-hidden="true">
                            <ReactionIcon
                                name={selectedReaction?.icon || 'like'}
                                size={20}
                                colored={Boolean(selectedReaction)}
                            />
                        </span>
                        <span>
                            {summary.total}
                            {/* {reactionLoading ? 'Loading…' : reactionBusy ? 'Saving…' : selectedReaction?.label || 'Like'} */}
                        </span>
                    </button>
                    {pickerOpen && (
                        <div
                            id={`reaction-picker-${post.id}`}
                            className="wc-reaction-picker"
                            role="group"
                            aria-label="Choose a reaction"
                        >
                            <div className="wc-reaction-options">
                                {REACTIONS.map((item) => (
                                    <button
                                        key={item.type}
                                        type="button"
                                        aria-label={`${item.label}, ${summary.counts[item.type] || 0} reactions`}
                                        aria-pressed={reaction?.type === item.type}
                                        title={`${item.label}: ${summary.counts[item.type] || 0}`}
                                        disabled={reactionBusy}
                                        onClick={() => chooseReaction(item.type)}
                                    >
                                        <ReactionIcon name={item.icon} size={28} colored />
                                        <small className="wc-picker-count">
                                            {summary.counts[item.type] || 0}
                                        </small>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* reposts */}
                <button
                    type="button"
                    className={repost.reposted ? 'is-reposted' : ''}
                    aria-pressed={repost.reposted}
                    aria-label={repost.reposted ? 'Undo your repost' : 'Repost this post'}
                    disabled={repostLoading || repostBusy || Boolean(repostError)}
                    onClick={toggleRepost}
                >
                    <Icon name="reshare" size={20} />
                    {repost.total}
                </button>

                <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label="View comments"
                    aria-haspopup="dialog"
                    title={commentsError || 'View comments'}
                    onClick={() => setExpanded((value) => !value)}
                >
                    <Icon name="comment" size={20} />{' '}
                    {commentsLoading ? '…' : (commentTotal ?? '—')}
                </button>

                <button
                    type="button"
                    aria-label="Send this post in a message"
                    title="Send in a message"
                    aria-haspopup="dialog"
                    aria-expanded={sharing}
                    onClick={() => setSharing(true)}
                >
                    <Icon name="send" size={20} />
                </button>

                <span className="wc-post-signoff">a moment shared</span>
            </footer>

            {reactionError && (
                <p className="wc-notice mx-3 mt-3" role="alert">
                    {reactionError}
                </p>
            )}

            {repostError && (
                <p className="wc-notice mx-3 mt-3" role="alert">
                    {repostError}
                </p>
            )}

            {expanded && (
                <CommentsPanel
                    post={post}
                    token={token}
                    currentUser={currentUser}
                    onClose={() => setExpanded(false)}
                    onCountChange={setCommentTotal}
                    reactionSummary={summary}
                />
            )}
            {reactorsOpen && (
                <ReactionsDialog
                    token={token}
                    postId={post.id}
                    onClose={() => setReactorsOpen(false)}
                />
            )}
            {sharing && (
                <SharePostDialog post={post} token={token} onClose={() => setSharing(false)} />
            )}
        </article>
    );
}
