import { useEffect, useState } from 'react';
import { listBlocks, unblockUser, announceSafety } from '../api/index.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import Avatar from '../../profiles/Avatar.js';
import Skeleton from '../../../shared/components/Skeleton.jsx';
// Loads the signed-in user’s blocked accounts and supports unblocking them.
export default function BlockedAccounts({ session }) {
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [more, setMore] = useState(false);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const result = await listBlocks(session.token, page, controller.signal);
                const items = await Promise.all(
                    result.data.map(async (row) => ({
                        ...row,
                        person: await getDisplayUser(
                            session.token,
                            row.user_id,
                            controller.signal,
                        ).catch(() => null),
                    })),
                );
                if (!controller.signal.aborted) {
                    setRows(items);
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
    }, [session.token, page, revision]);
    async function unblock(id) {
        setBusy(true);
        try {
            await unblockUser(session.token, id);
            announceSafety();
            setRevision((v) => v + 1);
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <main className="wc-safety-page">
            <p className="wc-overline">YOUR SPACE, YOUR CHOICE</p>
            <h1>Blocked accounts</h1>
            <p>
                Unblocking allows future connections. Previous friendships and follows aren’t
                restored.
            </p>
            {error && <p role="alert">{error}</p>}
            {loading ? (
                <Skeleton count={4} />
            ) : rows.length ? (
                rows.map((row) => (
                    <article className="wc-blocked-row" key={row.id}>
                        <Avatar
                            id={row.user_id}
                            name={row.person?.name || 'Unavailable account'}
                            token={session.token}
                            small
                        />
                        <span>
                            <strong>{row.person?.name || 'Unavailable account'}</strong>
                            <small>
                                {row.person?.username
                                    ? '@' + row.person.username
                                    : 'Account unavailable'}
                            </small>
                        </span>
                        <button disabled={busy} onClick={() => unblock(row.user_id)}>
                            Unblock
                        </button>
                    </article>
                ))
            ) : (
                <p>No blocked accounts.</p>
            )}
            <footer>
                <button disabled={page === 1 || busy} onClick={() => setPage((v) => v - 1)}>
                    Previous
                </button>
                <span>Page {page}</span>
                <button disabled={!more || busy} onClick={() => setPage((v) => v + 1)}>
                    Next
                </button>
            </footer>
        </main>
    );
}
