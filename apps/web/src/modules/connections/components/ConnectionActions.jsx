// Shows the relationship action available for this person and performs it.
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { getRelationship, sendFriendRequest, respondRequest, followPerson } from '../api/index.js';
export default function ConnectionActions({ session, userId, onChange }) {
    const [relation, setRelation] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const pending = useRef(false);
    useEffect(() => {
        const controller = new AbortController();
        getRelationship(session.token, userId, controller.signal)
            .then(setRelation)
            .catch((e) => {
                if (!controller.signal.aborted) setError(e.message);
            });
        return () => controller.abort();
    }, [session.token, userId]);
    async function act(action) {
        if (pending.current) return;
        pending.current = true;
        setBusy(true);
        setError('');
        try {
            await action();
            setRelation(await getRelationship(session.token, userId));
            onChange?.();
        } catch (e) {
            setError(e.message);
        } finally {
            pending.current = false;
            setBusy(false);
        }
    }
    if (userId === session.user.id) return null;
    if (!relation)
        return <span role={error ? 'alert' : 'status'}>{error || 'Loading connection…'}</span>;
    if (relation.blocked)
        return (
            <span className="wc-friends-label">
                {relation.blocked_by_me ? 'Blocked by you' : 'Connection unavailable'}
            </span>
        );
    const friendship = relation.friendship;
    const incoming = friendship?.requester_id !== session.user.id;
    return (
        <div className="wc-person-actions">
            {friendship?.status === 'accepted' ? (
                <>
                    <span className="wc-friends-label">✓ Friends</span>
                    <Link className="wc-message-friend" to={'/messages?with=' + userId}>
                        Message
                    </Link>
                </>
            ) : friendship?.status === 'pending' ? (
                incoming ? (
                    <>
                        <button
                            disabled={busy}
                            onClick={() =>
                                act(() => respondRequest(session.token, friendship.id, 'accept'))
                            }
                        >
                            Accept
                        </button>
                        <button
                            className="secondary"
                            disabled={busy}
                            onClick={() =>
                                act(() => respondRequest(session.token, friendship.id, 'reject'))
                            }
                        >
                            Decline
                        </button>
                    </>
                ) : (
                    <button
                        className="secondary"
                        disabled={busy}
                        onClick={() =>
                            act(() => respondRequest(session.token, friendship.id, 'cancel'))
                        }
                    >
                        Cancel request
                    </button>
                )
            ) : !friendship || friendship.status === 'cancelled' ? (
                <button
                    disabled={busy}
                    onClick={() => act(() => sendFriendRequest(session.token, userId))}
                >
                    Add friend
                </button>
            ) : (
                <span className="wc-friends-label">Request {friendship.status}</span>
            )}
            <button
                className="secondary"
                disabled={busy}
                onClick={() => act(() => followPerson(session.token, userId, relation.following))}
            >
                {relation.following ? 'Following · Unfollow' : 'Follow'}
            </button>
            {relation.follows_you && <small>Follows you</small>}
            {error && <p role="alert">{error}</p>}
        </div>
    );
}
