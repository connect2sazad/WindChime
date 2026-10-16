import Icon from '../../../shared/components/Icon.jsx';

import FriendRequestsPreview from '../../connections/RequestsPreview.js';
import { useNavigate } from 'react-router-dom';

import { useEffect, useRef, useState } from 'react';
import { getPersonalizedFeed } from '../../posts/api/index.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import Skeleton from '../../../shared/components/Skeleton.jsx';

// Loads the network or discovery feed, then handles paging and refresh actions.
export default function Home({ session, logoutError }) {
    const [feedMode, setFeedMode] = useState('network');
    const [posts, setPosts] = useState([]);
    const [feedLoading, setFeedLoading] = useState(true);
    const [feedError, setFeedError] = useState('');
    const [postNotice, setPostNotice] = useState('');
    const [feedCursor, setFeedCursor] = useState(null);
    const [feedPagination, setFeedPagination] = useState(null);
    const [feedRevision, setFeedRevision] = useState(0);
    const morePending = useRef(false);
    const route = useNavigate();
    const user = session.user;

    useEffect(() => {
        // A safety change should hide blocked content immediately; reload from page one.
        const changed = () => {
            setFeedCursor(null);
            setPosts([]);
            setFeedRevision((value) => value + 1);
        };
        window.addEventListener('windchime:safety-changed', changed);
        return () => window.removeEventListener('windchime:safety-changed', changed);
    }, []);
    useEffect(() => {
        // Re-fetch when the user, feed mode, cursor, or refresh counter changes.
        const controller = new AbortController();

        async function load() {
            setFeedLoading(true);
            setFeedError('');

            try {
                const result = await getPersonalizedFeed(
                    session.token,
                    controller.signal,
                    feedCursor,
                    feedMode,
                );

                // Resolve each creator once, then reuse that profile for repeated posts.
                const authors = new Map(
                    await Promise.all(
                        [...new Set(result.data.map((post) => post.creator_id))].map(async (id) => [
                            id,
                            id === user.id
                                ? { id: user.id, name: user.name, username: user.username }
                                : await getDisplayUser(session.token, id, controller.signal),
                        ]),
                    ),
                );
                const items = result.data.map((post) => {
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

                if (!controller.signal.aborted) {
                    setPosts((previous) =>
                        !feedCursor
                            ? items
                            : [
                                  ...previous,
                                  ...items.filter(
                                      (item) =>
                                          !previous.some((existing) => existing.id === item.id),
                                  ),
                              ],
                    );
                    setFeedPagination(result.pagination);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setFeedError(
                        error instanceof TypeError
                            ? 'Unable to reach WindChime. Please try again.'
                            : error.message,
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setFeedLoading(false);
                    morePending.current = false;
                }
            }
        }

        load();
        return () => controller.abort();
    }, [session.token, user.id, user.name, user.username, feedCursor, feedRevision, feedMode]);

    function navigate() {
        route('/connections');
    }
    function changeFeed(mode) {
        if (mode === feedMode) return;
        morePending.current = false;
        setFeedMode(mode);
        setFeedCursor(null);
        setPosts([]);
        setFeedPagination(null);
        setFeedLoading(true);
        setFeedError('');
    }
    function refreshFeed() {
        morePending.current = false;
        setFeedCursor(null);
        setFeedRevision((value) => value + 1);
        setFeedLoading(true);
    }

    return (
        <div className="wc-home">
            <main className="wc-feed">
                <header className="wc-feed-header">
                    <div>
                        <p className="wc-overline">YOUR DAILY BREATH OF FRESH AIR</p>
                        <h1>
                            A little <em>connection.</em>
                        </h1>
                    </div>
                    <span className="wc-header-mark" aria-hidden="true">
                        ✳
                    </span>
                </header>

                <nav className="wc-feed-tabs" aria-label="Feed selection">
                    <button
                        type="button"
                        className={feedMode === 'network' ? 'active' : ''}
                        aria-pressed={feedMode === 'network'}
                        onClick={() => changeFeed('network')}
                    >
                        Your circle
                    </button>
                    <button
                        type="button"
                        className={feedMode === 'discover' ? 'active' : ''}
                        aria-pressed={feedMode === 'discover'}
                        onClick={() => changeFeed('discover')}
                    >
                        Discover
                    </button>
                    <button
                        type="button"
                        className="wc-refresh-feed"
                        disabled={feedLoading}
                        onClick={refreshFeed}
                    >
                        ↻ Refresh
                    </button>
                </nav>
                <div className="wc-preview-label">
                    {feedMode === 'network'
                        ? 'Your posts, accepted friends, and people you follow · newest first'
                        : 'Public moments from across WindChime · newest first'}
                </div>
                {logoutError && (
                    <p className="wc-notice" role="alert">
                        {logoutError}
                    </p>
                )}

                {postNotice && (
                    <p className="wc-notice" role="status">
                        {postNotice}
                    </p>
                )}
                <div className="wc-feed-heading">
                    <h2>
                        {feedMode === 'network' ? 'From your circle' : 'Discover conversations'}
                    </h2>
                    <span>Latest moments</span>
                </div>

                {posts.map((post) => (
                    <PostCard
                        key={post.id}
                        post={post}
                        currentUser={user}
                        token={session.token}
                        onUpdated={(data) => {
                            setPosts((previous) =>
                                previous.map((item) =>
                                    item.id === data.id ? { ...item, ...data } : item,
                                ),
                            );
                            setPostNotice('Post updated.');
                        }}
                        onDeleted={(id) => {
                            setPosts((previous) => previous.filter((item) => item.id !== id));
                            setPostNotice('Post deleted.');
                        }}
                    />
                ))}

                {feedLoading && <Skeleton variant="feed" count={2} />}

                {feedError && (
                    <div className="wc-notice" role="alert">
                        <p>{feedError}</p>
                        <button
                            className="wc-feed-more"
                            onClick={() => setFeedRevision((value) => value + 1)}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {!feedLoading && !feedError && posts.length === 0 && (
                    <div className="wc-notice">
                        <p>
                            {feedMode === 'network'
                                ? 'Your circle is quiet. Follow someone or accept a friend request to see their moments here.'
                                : 'No public posts yet. Share the first moment.'}
                        </p>
                        {feedMode === 'network' && (
                            <button
                                className="wc-feed-more"
                                onClick={() => route('/connections?view=discover')}
                            >
                                Find your people →
                            </button>
                        )}
                    </div>
                )}
                {!feedLoading && !feedError && posts.length > 0 && (
                    <p className="wc-feed-end">
                        {feedPagination?.has_next_page ? (
                            <button
                                className="wc-feed-more"
                                disabled={feedLoading}
                                onClick={() => {
                                    if (morePending.current) return;
                                    morePending.current = true;
                                    setFeedCursor(feedPagination.next_cursor);
                                }}
                            >
                                Load more moments ↓
                            </button>
                        ) : (
                            'You’re all caught up ✳'
                        )}
                    </p>
                )}
            </main>

            <aside className="wc-right-panel" aria-label="Your account and connections">
                {/* <div className="wc-profile-summary">
                    <Avatar name={user.name} tone="lime" id={user.id} token={session.token} version={user.avatar_version} />
                    <div><strong>{user.name}</strong><p>@{user.username}</p></div>
                </div> */}

                <section className="wc-connection-card">
                    <div className="wc-mini-chimes" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                    </div>
                    <p className="wc-overline">MAKE ROOM FOR PEOPLE</p>
                    <h2>
                        A hello can
                        <br />
                        go a long way.
                    </h2>
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

import { PostCard } from '../../posts/PostCard.js';
