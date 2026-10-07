import ProfileLink from '../components/ProfileLink.jsx';
import PostOptions from '../components/PostOptions.jsx';
import { Icon, Avatar } from '../components/FeedVisuals.jsx';
import FriendRequestsPreview from '../components/FriendRequestsPreview.jsx';
import { useNavigate } from 'react-router-dom';
import PostMediaView from '../components/PostMediaView.jsx';
import ReactionIcon from '../components/ReactionIcon.jsx';
import { REACTIONS } from '../utils/reactionTypes.js';
import ReactionsDialog from '../components/ReactionsDialog.jsx';
import RelativeTime from '../components/RelativeTime.jsx';
import { useEffect, useRef, useState } from 'react';
import { getPosts } from '../api/posts.js';
import { getDisplayUser } from '../api/users.js';
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
import { getCommentSummary } from '../api/comments.js';
import CommentsPanel from '../components/CommentsPanel.jsx';
import './Home.css';



export function PostCard({ post, currentUser, token, onUpdated, onDeleted }) {
    const [reaction, setMyReaction] = useState(null);
    const [reactionLoading, setReactionLoading] = useState(true);
    const [reactionBusy, setReactionBusy] = useState(false);
    const [reactionError, setReactionError] = useState('');
    const [expanded, setExpanded] = useState(false);
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
    const preview = longText ? characters.slice(0,280).join('').trimEnd() + '…' : post.content;
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
                const result = await getCommentSummary(
                    token, post.id, controller.signal
                );

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
                <Avatar name={post.name} tone={post.tone} id={post.creator_id} token={token} />
                <div>
                    <ProfileLink className="wc-author-link" username={post.username}><strong>{post.name}</strong></ProfileLink>
                    <p>{post.username?`@${post.username}`:'Account unavailable'} <span>· <RelativeTime value={post.created_at} /></span></p>
                </div>
                <PostOptions post={post} currentUser={currentUser} token={token} onSaved={onUpdated} onDeleted={onDeleted}/>
            </header>

            <div className="wc-post-content">
                <span className="wc-topic">{post.kind==='reel'?'REEL':post.topic||'A SHARED MOMENT'}</span>
                <PostMediaView post={post} token={token} />
                {post.content && <p>{preview}</p>}
                {longText && <button type="button" className="wc-view-more" onClick={()=>setExpanded(true)}>View more</button>}
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
                            <ReactionIcon name={selectedReaction?.icon || 'like'} size={20} colored={Boolean(selectedReaction)} />
                        </span>
                        <span>
                            {reactionLoading ? 'Loading…' : reactionBusy ? 'Saving…' : selectedReaction?.label || 'Like'}
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
                                        <ReactionIcon name={item.icon} size={28} colored />
                                        <small className="wc-picker-count">{summary.counts[item.type] || 0}</small>
                                    </button>
                                ))}
                            </div>


                        </div>
                    )}
                </div>

                <button type="button" className="wc-reaction-details" disabled={reactionLoading || Boolean(reactionError)}
                    aria-label="See who reacted to this post" onClick={() => setReactorsOpen(true)}>
                    <span aria-hidden="true">{REACTIONS.filter(item => summary.counts[item.type] > 0).slice(0,3).map(item => <ReactionIcon key={item.type} name={item.icon} size={18} colored />)}</span>
                    {summary.total} {summary.total === 1 ? 'reaction' : 'reactions'}
                </button>

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
                            ? commentsError ? 'Comments' : commentsLoading ? 'Loading…' : 'Comments'
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
                <CommentsPanel post={post} token={token} currentUser={currentUser}
                    onClose={() => setExpanded(false)} onCountChange={setCommentTotal} reactionSummary={summary} />
            )}
            {reactorsOpen && <ReactionsDialog token={token} postId={post.id} onClose={() => setReactorsOpen(false)} />}
        </article>
    );
}

export default function Home({
    session,
    logoutError,
}) {
    const [posts, setPosts] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [postNotice,setPostNotice]=useState('');
    const [feedPage,setFeedPage]=useState(1); const [feedPagination,setFeedPagination]=useState(null); const [feedRevision,setFeedRevision]=useState(0); const morePending=useRef(false);
    const route = useNavigate();
    const user = session.user;

    useEffect(() => {
        const controller = new AbortController();

        async function load() {
            setFeedLoading(true);
            setFeedError('');

            try {
                const result = await getPosts(session.token, controller.signal, feedPage);

                const authors = new Map(await Promise.all([...new Set(result.data.map(post=>post.creator_id))].map(async id=>[id,id===user.id?{id:user.id,name:user.name,username:user.username}:await getDisplayUser(session.token,id,controller.signal)])));
                const items = result.data.map(post => {
                    const mine = post.creator_id === user.id;

                    return {
                        ...post,
                        name: authors.get(post.creator_id).name,
                        username: authors.get(post.creator_id).username,
                        tone: mine ? 'lime' : '',
                        topic: 'A SHARED MOMENT',
                        replies: [],
                    };
                });

                if (!controller.signal.aborted) {setPosts(previous=>feedPage===1?items:[...previous,...items.filter(item=>!previous.some(existing=>existing.id===item.id))]);setFeedPagination(result.pagination);}
            } catch (error) {
                if (!controller.signal.aborted) {
                    setFeedError(
                        error instanceof TypeError
                            ? 'Unable to reach WindChime. Please try again.'
                            : error.message
                    );
                }
            } finally {
                if (!controller.signal.aborted){setFeedLoading(false);morePending.current=false;}
            }
        }

        load();
        return () => controller.abort();
    }, [session.token, user.id, user.name, user.username, feedPage, feedRevision]);

    function navigate() { route('/connections'); }

    return (
        <div className="wc-home">
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
                {logoutError && (
                    <p className="wc-notice" role="alert">{logoutError}</p>
                )}

                {postNotice&&<p className="wc-notice" role="status">{postNotice}</p>}
                <div className="wc-feed-heading">
                    <h2>Latest conversations</h2><span>Latest moments</span>
                </div>

                {posts.map(post => (
                    <PostCard key={post.id} post={post} currentUser={user} token={session.token} onUpdated={data=>{setPosts(previous=>previous.map(item=>item.id===data.id?{...item,...data}:item));setPostNotice('Post updated.');}} onDeleted={id=>{setPosts(previous=>previous.filter(item=>item.id!==id));setPostNotice('Post deleted.');}}/>
                ))}

                {feedLoading && <p className="wc-notice" role="status">Loading conversations…</p>}

                {feedError && <div className="wc-notice" role="alert"><p>{feedError}</p><button className="wc-feed-more" onClick={()=>setFeedRevision(value=>value+1)}>Try again</button></div>}

                {!feedLoading && !feedError && posts.length === 0 && (
                    <p className="wc-notice">No posts yet. A small hello is a good start.</p>
                )}
                {!feedLoading && !feedError && posts.length > 0 && (
                    <p className="wc-feed-end">{feedPagination?.has_next_page?<button className="wc-feed-more" disabled={feedLoading} onClick={()=>{if(morePending.current)return;morePending.current=true;setFeedPage(value=>value+1);}}>Load more moments ↓</button>:'You’re all caught up ✳'}</p>
                )}
            </main>

            <aside className="wc-right-panel" aria-label="Your account and connections">
                <div className="wc-profile-summary">
                    <Avatar name={user.name} tone="lime" id={user.id} token={session.token} version={user.avatar_version}/>
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

                <FriendRequestsPreview session={session} />

                <footer className="wc-right-footer">
                    <p>A place for the little things worth sharing.</p>
                    <span>WindChime © {new Date().getFullYear()}</span>
                </footer>
            </aside>
        </div>
    );
}
