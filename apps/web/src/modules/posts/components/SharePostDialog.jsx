import { isBackdropClick } from '../../../shared/utils/dialog.js';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { listConnections } from '../../connections/api/index.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import { startConversation, sendMessage } from '../../messages/api/index.js';
import Avatar from '../../profiles/Avatar.js';

// Searches for a person, then shares the selected post with that recipient.
export default function SharePostDialog({ post, token, onClose }) {
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const dialog = useRef(null);
    const pending = useRef(false);
    const retry = useRef(new Map());
    const [friends, setFriends] = useState([]);
    const [page, setPage] = useState(1);
    const [more, setMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [sending, setSending] = useState(null);
    const [sent, setSent] = useState({});
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(query.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [query]);
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
            setLoading(true);
            try {
                const result = await listConnections(
                    token,
                    'friends',
                    page,
                    controller.signal,
                    search,
                );
                const users = await Promise.all(
                    result.data.map((row) => getDisplayUser(token, row.user_id, controller.signal)),
                );
                if (!controller.signal.aborted) {
                    setFriends((previous) =>
                        page === 1
                            ? users
                            : [
                                  ...previous,
                                  ...users.filter(
                                      (user) => !previous.some((item) => item.id === user.id),
                                  ),
                              ],
                    );
                    setMore(result.pagination.has_next_page);
                    setError('');
                }
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        load();
        return () => controller.abort();
    }, [token, page, search]);
    async function share(user) {
        if (pending.current || sent[user.id]) return;
        pending.current = true;
        setSending(user.id);
        setError('');
        try {
            const conversation = await startConversation(token, user.id);
            if (!retry.current.has(user.id)) retry.current.set(user.id, crypto.randomUUID());
            await sendMessage(token, conversation.id, '', retry.current.get(user.id), {
                postId: post.id,
            });
            setSent((previous) => ({ ...previous, [user.id]: conversation.id }));
        } catch (e) {
            setError(e.message);
        } finally {
            pending.current = false;
            setSending(null);
        }
    }
    return createPortal(
        <dialog
            ref={dialog}
            className="wc-share-post-dialog"
            aria-labelledby="share-post-title"
            onClick={(event) => {
                if (isBackdropClick(event) && !pending.current) onClose();
            }}
            onCancel={(event) => {
                event.preventDefault();
                if (!pending.current) onClose();
            }}
        >
            <header>
                <div>
                    <h2 id="share-post-title">Send to a friend</h2>
                    <p>Share this post in a private conversation.</p>
                </div>
                <button
                    aria-label="Close share dialog"
                    disabled={sending !== null}
                    onClick={onClose}
                >
                    ×
                </button>
            </header>
            <label className="wc-share-friend-search">
                Search friends
                <input
                    type="search"
                    value={query}
                    placeholder="Name or username"
                    maxLength={100}
                    disabled={sending !== null}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </label>
            <div className="wc-share-post-list">
                {friends.map((user) => (
                    <div key={user.id}>
                        <Avatar name={user.name} id={user.id} token={token} small />
                        <span>
                            <strong>{user.name}</strong>
                            <small>@{user.username}</small>
                        </span>
                        {sent[user.id] ? (
                            <Link to={'/messages?conversation=' + sent[user.id]} onClick={onClose}>
                                Sent · Open
                            </Link>
                        ) : (
                            <button
                                disabled={sending !== null || !user.username}
                                onClick={() => share(user)}
                            >
                                {sending === user.id ? 'Sending…' : 'Send'}
                            </button>
                        )}
                    </div>
                ))}
                {loading && <p role="status">Loading friends…</p>}
                {!loading && !friends.length && !error && (
                    <p>
                        {search
                            ? 'No matching friends. Try another name or username.'
                            : 'Accept a friend request before sharing posts through DMs.'}
                    </p>
                )}
                {error && <p role="alert">{error}</p>}
                {more && (
                    <button disabled={loading} onClick={() => setPage((value) => value + 1)}>
                        More friends
                    </button>
                )}
            </div>
        </dialog>,
        document.body,
    );
}
