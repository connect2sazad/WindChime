import { useEffect, useRef, useState } from 'react';
import { getPosts, createPost } from '../api/posts.js';
import {
    getReactionSummary,
    setReaction,
    removeReaction,
} from '../api/reactions.js';
import {
    getRepostSummary,
    addRepost,
    undoRepost,
} from '../api/reposts.js';
import { getComments, createComment } from '../api/comments.js';
import CommentItem from '../components/CommentItem.jsx';
import './Home.css';

const REACTIONS = [
    { type: 'like', label: 'Like', icon: '👍' },
    { type: 'love', label: 'Love', icon: '❤️' },
    { type: 'laugh', label: 'Laugh', icon: '😂' },
    { type: 'sad', label: 'Sad', icon: '😢' },
    { type: 'angry', label: 'Angry', icon: '😠' },
];

function Icon({ name, size = 22 }) {
    const paths = {
        home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
        search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
        people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6" /></>,
        plus: <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 7v10M7 12h10" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
        comment: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-5a9 9 0 1 1 16.6-4.5Z" />,
        arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        reshare: <><path d="M7 7h10a4 4 0 0 1 4 4v1" /><path d="m17 4 3 3-3 3" /><path d="M17 17H7a4 4 0 0 1-4-4v-1" /><path d="m7 20-3-3 3-3" /></>,
    };

    return (
        <svg width={size} height={size} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

function Avatar({ name, tone = '', small = false }) {
    const initials = name.trim().split(/\s+/)
        .slice(0, 2).map(part => part[0]).join('').toUpperCase();

    return (
        <span className={`wc-avatar ${tone} ${small ? 'small' : ''}`} aria-hidden="true">
            {initials}
        </span>
    );
}

function PostCard({ post, currentUser, token }) {
    const [reaction, setMyReaction] = useState(null);
    const [reactionLoading, setReactionLoading] = useState(true);
    const [reactionBusy, setReactionBusy] = useState(false);
    const [reactionError, setReactionError] = useState('');
    const [expanded, setExpanded] = useState(false);
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
    const [comments, setComments] = useState([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState('');
    const [commentTotal, setCommentTotal] = useState(null);
    const [commentDraft, setCommentDraft] = useState('');
    const [commentSaving, setCommentSaving] = useState(false);
    const [commentSaveError, setCommentSaveError] = useState('');
    const commentPending = useRef(false);

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

    const selectedReaction = REACTIONS.find(
        item => item.type === reaction?.type
    );

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setRepostLoading(true);
            setRepostError('');

            try {
                const result = await getRepostSummary(
                    token, post.id, controller.signal
                );
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

    function commentDeleted(id) {
        setComments(previous => previous.filter(comment => comment.id !== id));
        setCommentTotal(previous => Math.max(0, (previous ?? 0) - 1));
    }

    async function addComment(event) {
        event.preventDefault();

        const content = commentDraft.trim();
        if (!content || commentPending.current || commentsLoading || commentsError) return;

        commentPending.current = true;
        setCommentSaving(true);
        setCommentSaveError('');

        try {
            const comment = await createComment(token, post.id, content);

            setComments(previous => [comment, ...previous]);
            setCommentTotal(previous => (previous ?? 0) + 1);
            setCommentDraft('');
        } catch (error) {
            setCommentSaveError(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm your comment. Refresh before retrying.'
                    : error.message
            );
        } finally {
            commentPending.current = false;
            setCommentSaving(false);
        }
    }

    useEffect(() => {
        const controller = new AbortController();

        async function loadReaction() {
            setReactionLoading(true);
            setReactionError('');

            try {
                const saved = await getReactionSummary(
                    token, post.id, controller.signal
                );

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
                const result = await getComments(
                    token, post.id, controller.signal
                );

                if (!controller.signal.aborted) {
                    setComments(result.data);
                    setCommentTotal(result.pagination.total);
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

            const saved = await getReactionSummary(
                token, post.id, AbortSignal.timeout(10000)
            );

            setMyReaction(saved.my_reaction);
            setSummary({
                counts: saved.counts,
                total: saved.total,
            });
        } catch {
            setReactionError(
                'Could not confirm the latest reactions. Reload before retrying.'
            );
        } finally {
            mutationPending.current = false;
            setReactionBusy(false);
        }
    }

    async function clearReaction() {
        if (reactionLoading || reactionBusy || reactionError || !reaction || mutationPending.current) return;
        mutationPending.current = true;

        setReactionBusy(true);
        setPickerOpen(false);

        try {
            await removeReaction(token, post.id);

            const saved = await getReactionSummary(
                token, post.id, AbortSignal.timeout(10000)
            );

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

    function startHold(event) {
        if (!event.isPrimary || event.button !== 0 || reactionBusy || reactionLoading || reactionError) return;
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
        if (held.current) { held.current = false; return; }
        if (pickerOpen) { setPickerOpen(false); return; }
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

            const result = await getRepostSummary(
                token, post.id, AbortSignal.timeout(10000)
            );

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
                <Avatar name={post.name} tone={post.tone} />
                <div>
                    <strong>{post.name}</strong>
                    <p>@{post.username} <span>· {post.time}</span></p>
                </div>
                <span className="wc-post-flower" aria-hidden="true">✳</span>
            </header>

            <div className="wc-post-content">
                <span className="wc-topic">{post.topic}</span>
                <p>{post.content}</p>
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
                        onPointerCancel={() => { stopHold(); held.current = true; }}
                        onPointerLeave={stopHold}
                        onContextMenu={event => event.preventDefault()}
                        onKeyDown={event => {
                            if (event.key === 'ArrowDown') {
                                event.preventDefault();
                                setPickerOpen(true);
                                requestAnimationFrame(() => reactionControl.current?.querySelector('.wc-reaction-options button')?.focus());
                            }
                        }}
                        title="Click to like or remove your reaction. Hold to choose."
                        aria-label={reaction ? 'Remove your reaction; hold or press Down Arrow to choose another' : 'Like this post; hold or press Down Arrow to choose a reaction'}
                        onClick={clickReaction}
                    >
                        <span aria-hidden="true">
                            {selectedReaction?.icon || '👍'}
                        </span>
                        <span>
                            {summary.total} reactions
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
                                {REACTIONS.map(item => (
                                    <button
                                        key={item.type}
                                        type="button"
                                        aria-label={`${item.label}, ${summary.counts[item.type] || 0} reactions`}
                                        aria-pressed={reaction?.type === item.type}
                                        title={`${item.label}: ${summary.counts[item.type] || 0}`}
                                        disabled={reactionBusy}
                                        onClick={() => chooseReaction(item.type)}
                                    >
                                        <span aria-hidden="true">{item.icon}</span>
                                        <small className="wc-picker-count">{summary.counts[item.type] || 0}</small>
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
                    <span>
                        {repostLoading ? 'Loading…'
                            : repostBusy ? 'Saving…'
                                : `${repost.total} ${repost.total === 1 ? 'repost' : 'reposts'}`}
                    </span>
                </button>

                <button aria-expanded={expanded}
                    onClick={() => setExpanded(value => !value)}>
                    <Icon name="comment" size={20} />
                    <span>
                        {commentTotal === null
                            ? commentsError ? 'Comments' : 'Loading…'
                            : commentTotal + (commentTotal == 1 ? ' comment' : ' comments')}
                    </span>
                </button>
                <span className="wc-post-signoff">a moment shared</span>
            </footer>

            {reactionError && (
                <p className="wc-notice mx-3 mt-3" role="alert">{reactionError}</p>
            )}

            {repostError && (
                <p className="wc-notice mx-3 mt-3" role="alert">{repostError}</p>
            )}

            {expanded && (
                <section className="wc-comments" aria-label="Comments">

                    {commentSaveError && (
                        <p className="mt-3" role="alert">{commentSaveError}</p>
                    )}

                    <form className="wc-comment-form" onSubmit={addComment}>
                        <input
                            aria-label="Write a comment"
                            placeholder="Add to the conversation…"
                            value={commentDraft}
                            onChange={event => setCommentDraft(event.target.value)}
                            maxLength={2000}
                            disabled={commentSaving}
                            required
                        />
                        <button
                            type="submit"
                            disabled={
                                !commentDraft.trim() ||
                                commentSaving ||
                                commentsLoading ||
                                Boolean(commentsError)
                            }
                            aria-label={commentSaving ? 'Posting comment' : 'Post comment'}
                        >
                            {commentSaving ? '…' : <Icon name="arrow" size={19} />}
                        </button>
                    </form>

                    {commentsLoading && (
                        <p role="status">Loading comments…</p>
                    )}

                    {commentsError && (
                        <p role="alert">{commentsError}</p>
                    )}

                    {!commentsLoading && !commentsError && comments.length === 0 && (
                        <p>Be the first to start a conversation.</p>
                    )}

                    {!commentsLoading && !commentsError && comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            postId={post.id}
                            token={token}
                            currentUser={currentUser}
                            onDeleted={commentDeleted}
                        />
                    ))}

                    {!commentsLoading && !commentsError && commentTotal > comments.length && (
                        <p>Showing the latest {comments.length} of {commentTotal} comments.</p>
                    )}
                </section>
            )}
        </article>
    );
}

export default function Home({
    session,
    onLogout,
    loggingOut,
    logoutError,
}) {
    const [posts, setPosts] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [draft, setDraft] = useState('');
    const [notice, setNotice] = useState('');
    const [publishing, setPublishing] = useState(false);
    const composer = useRef(null);
    const user = session.user;

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setFeedLoading(true);
            setFeedError('');

            try {
                const result = await getPosts(session.token, controller.signal);

                const items = result.data.map(post => {
                    const mine = post.creator_id === user.id;

                    return {
                        ...post,
                        name: mine ? user.name : `Member #${post.creator_id}`,
                        username: mine ? user.username : `member-${post.creator_id}`,
                        time: new Date(post.created_at).toLocaleString(),
                        tone: mine ? 'lime' : '',
                        topic: 'A SHARED MOMENT',
                        replies: [],
                    };
                });

                if (!controller.signal.aborted) setPosts(items);
            } catch (error) {
                if (!controller.signal.aborted) {
                    setFeedError(
                        error instanceof TypeError
                            ? 'Unable to reach WindChime. Please try again.'
                            : error.message
                    );
                }
            } finally {
                if (!controller.signal.aborted) setFeedLoading(false);
            }
        }

        load();
        return () => controller.abort();
    }, [session.token, user.id, user.name, user.username]);

    async function publish(event) {
        event.preventDefault();

        const content = draft.trim();
        if (!content || publishing || feedLoading) return;

        setPublishing(true);
        setNotice('');

        try {
            const post = await createPost(session.token, content);

            const item = {
                ...post,
                name: user.name,
                username: user.username,
                time: new Date(post.created_at).toLocaleString(),
                tone: 'lime',
                topic: 'YOUR MOMENT',
                replies: [],
            };

            setPosts(previous => [item, ...previous]);
            setDraft('');
            setNotice('Your moment is shared.');
        } catch (error) {
            setNotice(
                error instanceof TypeError || error.name === 'TimeoutError'
                    ? 'Could not confirm publication. Check your feed before retrying.'
                    : error.message
            );
        } finally {
            setPublishing(false);
        }
    }

    function navigate(item) {
        if (item === 'Create') {
            window.scrollTo({ top: 0, behavior: 'auto' });
            composer.current?.focus();
        } else if (item === 'Home') {
            window.scrollTo({ top: 0, behavior: 'auto' });
            setNotice('');
        } else {
            setNotice(`${item} will be connected in a later step.`);
        }
    }

    const navigation = [
        ['Home', 'home'], ['Search', 'search'], ['Connections', 'people'],
        ['Create', 'plus'], ['Profile', 'user'],
    ];

    return (
        <div className="wc-home">
            <aside className="wc-sidebar">
                {/* <div className="wc-logo">windchime<span>✳</span></div> */}
                <div className="wc-logo"><img src="./logo.svg" alt="" srcset="" /></div>
                <span className="wc-sidebar-caption">A LITTLE CLOSER.</span>

                <nav className="wc-nav" aria-label="Main navigation">
                    {navigation.map(([label, icon]) => (
                        <button key={label}
                            className={label === 'Home' ? 'active' : ''}
                            aria-current={label === 'Home' ? 'page' : undefined}
                            onClick={() => navigate(label)}>
                            <Icon name={icon} /><span>{label}</span>
                            {label === 'Home' && <i aria-hidden="true" />}
                        </button>
                    ))}
                </nav>

                <div className="wc-sidebar-bottom">
                    <div className="wc-sidebar-note">
                        <span aria-hidden="true">✳</span>
                        <p>Less noise.<br /><strong>More people.</strong></p>
                    </div>
                    <button className="wc-account" onClick={() => navigate('Account')}>
                        <Avatar name={user.name} small />
                        <span><strong>{user.name}</strong><small>@{user.username}</small></span>
                    </button>
                    <button
                        type="button"
                        className="wc-logout"
                        onClick={onLogout}
                        disabled={loggingOut}
                    >
                        {loggingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                </div>
            </aside>

            <main className="wc-feed">
                <header className="wc-feed-header">
                    <div>
                        <p className="wc-overline">YOUR DAILY BREATH OF FRESH AIR</p>
                        <h1>A little <em>connection.</em></h1>
                    </div>
                    <span className="wc-header-mark" aria-hidden="true">✳</span>
                </header>

                <div className="wc-preview-label">
                    Latest conversations · newest first
                </div>
                {notice && <p className="wc-notice" role="status">{notice}</p>}
                {logoutError && (
                    <p className="wc-notice" role="alert">{logoutError}</p>
                )}

                <form className="wc-composer" onSubmit={publish}>
                    <div className="wc-composer-top">
                        <Avatar name={user.name} tone="lime" />
                        <textarea ref={composer}
                            aria-label="Write a post" disabled={publishing}
                            placeholder={`What’s on your mind, ${user.name.split(' ')[0]}?`}
                            value={draft} onChange={event => setDraft(event.target.value)}
                            maxLength={2000} rows={2} />
                    </div>
                    <div className="wc-composer-bottom">
                        <span>A thought. A question. A small hello.</span>
                        <button
                            type="submit"
                            disabled={!draft.trim() || publishing || feedLoading}
                        >
                            {publishing ? 'Sharing…' : 'Share'}
                            <Icon name="arrow" size={17} />
                        </button>
                    </div>
                </form>

                <div className="wc-feed-heading">
                    <h2>Latest conversations</h2><span>Latest moments</span>
                </div>

                {posts.map(post => (
                    <PostCard key={post.id} post={post} currentUser={user} token={session.token} />
                ))}

                {feedLoading && <p className="wc-notice" role="status">Loading conversations…</p>}

                {feedError && <p className="wc-notice" role="alert">{feedError}</p>}

                {!feedLoading && !feedError && posts.length === 0 && (
                    <p className="wc-notice">No posts yet. A small hello is a good start.</p>
                )}
                {!feedLoading && !feedError && posts.length > 0 && (
                    <p className="wc-feed-end">Recent moments from WindChime ✳</p>
                )}
            </main>

            <aside className="wc-right-panel" aria-label="Your account and connections">
                <div className="wc-profile-summary">
                    <Avatar name={user.name} tone="lime" />
                    <div><strong>{user.name}</strong><p>@{user.username}</p></div>
                </div>

                <section className="wc-connection-card">
                    <div className="wc-mini-chimes" aria-hidden="true">
                        <span /><span /><span />
                    </div>
                    <p className="wc-overline">MAKE ROOM FOR PEOPLE</p>
                    <h2>A hello can<br />go a long way.</h2>
                    <p>Find familiar faces and make room for new ones.</p>
                    <button onClick={() => navigate('Connections')}>
                        Find your people <Icon name="arrow" size={18} />
                    </button>
                </section>

                <div className="wc-panel-heading">
                    <h2>Friend requests</h2><span>Preview</span>
                </div>
                <div className="wc-empty-requests">
                    <Icon name="people" size={25} />
                    <p>New connections will appear here.</p>
                </div>

                <footer className="wc-right-footer">
                    <p>A place for the little things worth sharing.</p>
                    <span>WindChime © {new Date().getFullYear()}</span>
                </footer>
            </aside>
        </div>
    );
}