import { useEffect, useRef, useState } from 'react';
import {
    getRelationship,
    removeFollower,
    respondRequest,
    unfriendPerson,
} from '../../connections/api/index.js';
import { announceSafety, blockUser, unblockUser } from '../../safety/api/index.js';
import ReportDialog from '../../safety/components/ReportDialog.jsx';

export default function ProfileMoreMenu({ session, userId, own = false, onShare, onChange }) {
    const root = useRef(null);
    const [open, setOpen] = useState(false);
    const [relation, setRelation] = useState(null);
    const [reportOpen, setReportOpen] = useState(false);
    const [confirmBlock, setConfirmBlock] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (own) return undefined;
        const controller = new AbortController();
        getRelationship(session.token, userId, controller.signal)
            .then((value) => {
                if (!controller.signal.aborted) setRelation(value);
            })
            .catch((requestError) => {
                if (!controller.signal.aborted) setError(requestError.message);
            });
        return () => controller.abort();
    }, [own, session.token, userId]);

    useEffect(() => {
        if (!open) return undefined;
        function closeOnOutside(event) {
            if (!root.current?.contains(event.target)) setOpen(false);
        }
        function closeOnEscape(event) {
            if (event.key === 'Escape') setOpen(false);
        }
        document.addEventListener('pointerdown', closeOnOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOnOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [open]);

    async function run(action) {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
            await action();
            setRelation(await getRelationship(session.token, userId));
            setConfirmBlock(false);
            setOpen(false);
            onChange?.();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusy(false);
        }
    }

    function share() {
        setOpen(false);
        onShare?.();
    }

    function navigateMenu(event) {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const items = [...root.current.querySelectorAll('[role="menuitem"]:not(:disabled)')];
        if (!items.length) return;
        event.preventDefault();
        const current = items.indexOf(document.activeElement);
        const next = event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? items.length - 1
              : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items[next].focus();
    }

    return (
        <div className="wc-profile-more" ref={root} onKeyDown={navigateMenu}>
            <button
                className="wc-profile-more-trigger"
                type="button"
                aria-label="More profile options"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
            >
                <span aria-hidden="true">⋯</span>
            </button>
            {open && (
                <div className="wc-profile-more-menu" role="menu" aria-label="Profile options">
                    <button role="menuitem" type="button" onClick={share}>
                        Share profile
                    </button>
                    {!own && relation?.friendship?.status === 'accepted' && (
                        <button
                            className={!relation.blocked_by_me ? 'is-destructive' : ''}
                            role="menuitem"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                                run(() => unfriendPerson(session.token, relation.friendship.id))
                            }
                        >
                            Unfriend
                        </button>
                    )}
                    {!own && relation?.follows_you && (
                        <button
                            className="is-destructive"
                            role="menuitem"
                            type="button"
                            disabled={busy}
                            onClick={() => run(() => removeFollower(session.token, userId))}
                        >
                            Remove follower
                        </button>
                    )}
                    {!own && relation?.friendship?.status === 'pending' &&
                        relation.friendship.requester_id !== session.user.id && (
                            <button
                                role="menuitem"
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                    run(() =>
                                        respondRequest(
                                            session.token,
                                            relation.friendship.id,
                                            'reject',
                                        ),
                                    )
                                }
                            >
                                Decline friend request
                            </button>
                        )}
                    {!own && <button
                        className={!relation?.blocked_by_me ? 'is-destructive' : ''}
                        role="menuitem"
                        type="button"
                        disabled={busy || !relation}
                        onClick={() =>
                            relation?.blocked_by_me
                                ? run(async () => {
                                      await unblockUser(session.token, userId);
                                      announceSafety();
                                  })
                                : setConfirmBlock((value) => !value)
                        }
                    >
                        {relation?.blocked_by_me ? 'Unblock account' : 'Block account'}
                    </button>}
                    {!own && <button
                        className="is-destructive"
                        role="menuitem"
                        type="button"
                        onClick={() => {
                            setOpen(false);
                            setReportOpen(true);
                        }}
                    >
                        Report account
                    </button>}
                    {!own && confirmBlock && (
                        <section className="wc-profile-block-confirm" aria-label="Confirm block">
                            <strong>Block this account?</strong>
                            <p>They will no longer be able to interact with you or see your content.</p>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() =>
                                    run(async () => {
                                        await blockUser(session.token, userId);
                                        announceSafety();
                                    })
                                }
                            >
                                {busy ? 'Blocking…' : 'Confirm block'}
                            </button>
                            <button type="button" disabled={busy} onClick={() => setConfirmBlock(false)}>
                                Cancel
                            </button>
                        </section>
                    )}
                    {error && <p role="alert">{error}</p>}
                </div>
            )}
            {reportOpen && !own && (
                <ReportDialog
                    token={session.token}
                    targetType="user"
                    targetId={userId}
                    userId={userId}
                    onClose={() => setReportOpen(false)}
                />
            )}
        </div>
    );
}
