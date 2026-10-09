import ReportMedia from '../components/ReportMedia.jsx';
import { useEffect, useRef, useState } from 'react';
import { capabilities, listReports, reviewReport, reportHistory } from '../api/index.js';
function Review({ report, session, onDone }) {
    const [action, setAction] = useState(report.status === 'open' ? 'dismiss' : 'restore_user');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [history, setHistory] = useState(null);
    const nonce = useRef(crypto.randomUUID());
    async function submit(event) {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
            await reviewReport(session.token, report.id, {
                action,
                note,
                decision_id: nonce.current,
            });
            onDone();
        } catch (e) {
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }
    const snapshot =
        typeof report.snapshot === 'string' ? JSON.parse(report.snapshot) : report.snapshot;
    return (
        <article className="wc-moderation-report">
            <header>
                <strong>
                    Report #{report.id} · {report.target_type} #{report.target_id}
                </strong>
                <span>{report.status}</span>
            </header>
            <p>
                <strong>Reason:</strong> {report.reason.replaceAll('_', ' ')} · account #
                {report.reported_user_id}
            </p>
            {report.details && <p>{report.details}</p>}
            <blockquote>
                {snapshot.content || snapshot.name || 'No text available'}
                {snapshot.username && <small>@{snapshot.username}</small>}
            </blockquote>
            {snapshot.media?.length > 0 && (
                <ReportMedia media={snapshot.media} reportId={report.id} token={session.token} />
            )}{' '}
            {report.status === 'open' ||
            (session.user.role === 'admin' && report.resolution === 'suspend_user') ? (
                <form onSubmit={submit}>
                    <label>
                        Decision
                        <select
                            value={action}
                            disabled={busy}
                            onChange={(event) => {
                                setAction(event.target.value);
                                nonce.current = crypto.randomUUID();
                            }}
                        >
                            {report.status === 'open' && (
                                <option value="dismiss">Dismiss report</option>
                            )}
                            {report.status === 'open' &&
                                ['post', 'comment'].includes(report.target_type) && (
                                    <option value="hide_content">Hide content</option>
                                )}
                            {report.status === 'open' && (
                                <option value="suspend_user">Suspend account</option>
                            )}
                            {session.user.role === 'admin' && (
                                <option value="restore_user">Restore account</option>
                            )}
                        </select>
                    </label>
                    {action === 'suspend_user' && (
                        <p className="wc-safety-note">
                            Suspension disables login and existing sessions. Only an admin can
                            restore the account.
                        </p>
                    )}
                    <label>
                        Decision reason
                        <textarea
                            value={note}
                            minLength={10}
                            maxLength={2000}
                            required
                            disabled={busy}
                            onChange={(event) => {
                                setNote(event.target.value);
                                nonce.current = crypto.randomUUID();
                            }}
                        />
                    </label>
                    <button disabled={busy || note.trim().length < 10}>
                        {busy
                            ? 'Saving…'
                            : {
                                  dismiss: 'Dismiss report',
                                  hide_content: 'Hide content',
                                  suspend_user: 'Suspend account',
                                  restore_user: 'Restore account',
                              }[action]}
                    </button>
                </form>
            ) : (
                <p>
                    {report.resolution}: {report.decision_note}
                </p>
            )}
            <button
                onClick={async () => {
                    try {
                        setHistory((await reportHistory(session.token, report.id)).data);
                    } catch (e) {
                        setError(e.message);
                    }
                }}
            >
                Decision history
            </button>
            {history && (
                <ul>
                    {history.map((item) => (
                        <li key={item.id}>
                            {item.action} · staff #{item.actor_id}: {item.note}
                        </li>
                    ))}
                </ul>
            )}
            {error && <p role="alert">{error}</p>}
        </article>
    );
}
// Moderator queue: loads reports by status and records each review decision.
export default function Moderation({ session }) {
    const [allowed, setAllowed] = useState(null);
    const [rows, setRows] = useState([]);
    const [status, setStatus] = useState('open');
    const [page, setPage] = useState(1);
    const [more, setMore] = useState(false);
    const [error, setError] = useState('');
    const [revision, setRevision] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const permissions = await capabilities(session.token, controller.signal);
                if (!controller.signal.aborted) setAllowed(permissions.data.can_moderate);
                if (!permissions.data.can_moderate) return;
                const result = await listReports(session.token, page, status, controller.signal);
                if (!controller.signal.aborted) {
                    setRows(result.data);
                    setMore(result.pagination.has_next_page);
                    setError('');
                }
            } catch (e) {
                if (!controller.signal.aborted) setError(e.message);
            }
        }
        load();
        return () => controller.abort();
    }, [session.token, page, status, revision]);
    return (
        <main className="wc-safety-page">
            <p className="wc-overline">STAFF WORKSPACE</p>
            <h1>Moderation</h1>
            {allowed === false ? (
                <p role="alert">This page is available only to designated moderators and admins.</p>
            ) : allowed === null ? (
                <p role="status">Checking staff access…</p>
            ) : (
                <>
                    <div className="wc-moderation-filters">
                        {['open', 'resolved', 'dismissed', 'all'].map((value) => (
                            <button
                                key={value}
                                aria-pressed={status === value}
                                onClick={() => {
                                    setStatus(value);
                                    setPage(1);
                                }}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                    {rows.map((row) => (
                        <Review
                            key={
                                row.id +
                                ':' +
                                row.status +
                                ':' +
                                row.resolution +
                                ':' +
                                row.updated_at
                            }
                            report={row}
                            session={session}
                            onDone={() => setRevision((v) => v + 1)}
                        />
                    ))}
                    {!rows.length && <p>No reports in this section.</p>}
                    <footer>
                        <button disabled={page === 1} onClick={() => setPage((v) => v - 1)}>
                            Previous
                        </button>
                        <span>Page {page}</span>
                        <button disabled={!more} onClick={() => setPage((v) => v + 1)}>
                            Next
                        </button>
                    </footer>
                </>
            )}
            {error && <p role="alert">{error}</p>}
        </main>
    );
}
