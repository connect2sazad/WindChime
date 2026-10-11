// Shows the relationship action available for this person and performs it.
import { useEffect, useRef, useState } from 'react';
import {
    getRelationship,
    sendFriendRequest,
    respondRequest,
    followPerson,
    removeFollower,
} from '../api/index.js';
export default function ConnectionActions({ session, userId, onChange, showRemoveFollower = false }) {
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
    function actFriend() {
        const friendship = relation?.friendship;
        if (friendship?.status === 'accepted') return;
        if (friendship?.status === 'pending') {
            const incoming = friendship.requester_id !== session.user.id;
            return act(() =>
                respondRequest(session.token, friendship.id, incoming ? 'accept' : 'cancel'),
            );
        }
        return act(() => sendFriendRequest(session.token, userId));
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
    const incoming = friendship?.status === 'pending' && friendship.requester_id !== session.user.id;
    return (
        <div className="wc-person-actions">
            <button
                type="button"
                className={friendship?.status === 'accepted' ? 'secondary is-connected' : ''}
                disabled={busy || friendship?.status === 'accepted'}
                onClick={actFriend}
            >
                {friendship?.status === 'accepted'
                    ? 'Friends'
                    : incoming
                      ? 'Accept request'
                      : friendship?.status === 'pending'
                        ? 'Cancel request'
                        : 'Add friend'}
            </button>
            <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => act(() => followPerson(session.token, userId, relation.following))}
            >
                {relation.following ? 'Unfollow' : 'Follow'}
            </button>
            {showRemoveFollower && relation.follows_you && (
                <button
                    type="button"
                    className="secondary wc-remove-follower"
                    disabled={busy}
                    onClick={() => act(() => removeFollower(session.token, userId))}
                >
                    Remove follower
                </button>
            )}
            {error && <p role="alert">{error}</p>}
        </div>
    );
}
