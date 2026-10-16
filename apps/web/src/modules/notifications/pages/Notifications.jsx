import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listNotifications, markRead, markAllRead, announceRead } from '../api/index.js';
import { notificationText, notificationDestination } from '../utils/notificationText.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import Avatar from '../../profiles/Avatar.js';
import RelativeTime from '../../../shared/components/RelativeTime.jsx';
import Icon from '../../../shared/components/Icon.jsx';
import Skeleton from '../../../shared/components/Skeleton.jsx';
// Loads notification pages and handles opening or marking notifications as read.
export default function Notifications({ session }) {
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [unread, setUnread] = useState(false);
    const [more, setMore] = useState(false);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [refresh, setRefresh] = useState(0);
    const navigate = useNavigate();
    useEffect(() => {
        const controller = new AbortController();
        let running = false;
        async function load() {
            if (running) return;
            running = true;
            try {
                const result = await listNotifications(session.token, {
                    page,
                    unread,
                    signal: controller.signal,
                });
                const ids = [...new Set(result.data.map((row) => row.actor_id))];
                const actors = new Map(
                    await Promise.all(
                        ids.map(async (id) => [
                            id,
                            await getDisplayUser(session.token, id, controller.signal).catch(
                                () => null,
                            ),
                        ]),
                    ),
                );
                if (!controller.signal.aborted) {
                    setRows(
                        result.data.map((row) => ({ ...row, actor: actors.get(row.actor_id) })),
                    );
                    setMore(result.pagination.has_next_page);
                    setCount(result.unread_count);
                    setError('');
                }
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            } finally {
                running = false;
                if (!controller.signal.aborted) setLoading(false);
            }
        }
        load();
        const timer = setInterval(() => {
            if (!document.hidden) load();
        }, 15000);
        return () => {
            controller.abort();
            clearInterval(timer);
        };
    }, [session.token, page, unread, refresh]);
    async function open(row) {
        if (busy) return;
        setBusy(true);
        try {
            if (!row.read_at) {
                await markRead(session.token, row.id);
                announceRead();
            }
            navigate(notificationDestination(row, row.actor));
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    async function readAll() {
        if (busy || !rows.length) return;
        setBusy(true);
        try {
            const latest = await listNotifications(session.token);
            if (latest.data.length) await markAllRead(session.token, latest.data[0].id);
            announceRead();
            setRefresh((v) => v + 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className="wc-notifications-page">
            <header className="wc-notifications-heading">
                <div>
                    <span className="wc-notifications-eyebrow">YOUR LITTLE CONNECTIONS</span>
                    <h1>Someone thought of you.</h1>
                    <p>
                        {count
                            ? count + ' unread ' + (count === 1 ? 'notification' : 'notifications')
                            : 'You’re all caught up.'}
                    </p>
                </div>
                <button type="button" onClick={readAll} disabled={busy || !count || !rows.length}>
                    Mark all as read
                </button>
            </header>
            <div className="wc-notifications-filters" aria-label="Notification filters">
                {[
                    ['All', false],
                    ['Unread', true],
                ].map(([label, value]) => (
                    <button
                        key={label}
                        aria-pressed={unread === value}
                        onClick={() => {
                            setUnread(value);
                            setPage(1);
                            setLoading(true);
                        }}
                    >
                        {label}
                    </button>
                ))}
                <button
                    className="wc-notification-refresh"
                    onClick={() => {
                        setLoading(true);
                        setRefresh((v) => v + 1);
                    }}
                >
                    Refresh
                </button>
            </div>
            {error && (
                <p className="wc-notification-error" role="alert">
                    {error} <button onClick={() => setRefresh((v) => v + 1)}>Retry</button>
                </p>
            )}
            {loading ? (
                <Skeleton count={5} />
            ) : rows.length ? (
                <ul className="wc-notification-list">
                    {rows.map((row) => (
                        <li key={row.id} className={!row.read_at ? 'unread' : ''}>
                            <button disabled={busy} onClick={() => open(row)}>
                                <Avatar
                                    id={row.actor_id}
                                    token={session.token}
                                    name={row.actor?.name || 'Member'}
                                    small
                                />
                                <span>
                                    <strong>{row.actor?.name || 'A WindChime member'}</strong>{' '}
                                    {notificationText(row.type)}.
                                    <small>
                                        {row.actor?.username && '@' + row.actor.username + ' · '}
                                        <RelativeTime value={row.occurred_at} />
                                    </small>
                                </span>
                                {!row.read_at && (
                                    <i className="wc-notification-dot" aria-label="Unread" />
                                )}
                                <Icon name="arrow" size={18} />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                !error && (
                    <section className="wc-notification-empty">
                        <Icon name="bell" size={36} />
                        <h2>{unread ? 'All caught up' : 'A quiet moment'}</h2>
                        <p>Friend requests, conversations and reactions will appear here.</p>
                    </section>
                )
            )}
            <footer className="wc-notification-pagination">
                <button
                    disabled={page === 1 || busy || loading}
                    onClick={() => {
                        setPage((v) => v - 1);
                        setLoading(true);
                    }}
                >
                    Previous
                </button>
                <span>Page {page}</span>
                <button
                    disabled={!more || busy || loading}
                    onClick={() => {
                        setPage((v) => v + 1);
                        setLoading(true);
                    }}
                >
                    Next
                </button>
            </footer>
        </main>
    );
}
