import VideoPlayer from '../../../shared/components/VideoPlayer.jsx';
import MessageActions from './MessageActions.jsx';
import ForwardMessageDialog from './ForwardMessageDialog.jsx';
import ReactionIcon from '../../reactions/Icon.js';
import { REACTIONS } from '../../reactions/types.js';
import MessageContent from './MessageContent.jsx';
import { useEffect, useRef, useState } from 'react';

import { getMessages, sendMessage, markRead, syncMessages, reactToMessage } from '../api/index.js';

import { getDisplayUser } from '../../profiles/api/index.js';
import Avatar from '../../profiles/Avatar.js';
import Icon from '../../../shared/components/Icon.jsx';
import ProfileLink from '../../profiles/ProfileLink.js';
import RelativeTime from '../../../shared/components/RelativeTime.jsx';

// Owns one conversation: message history, pagination, attachments, replies, and sending.
export default function Conversation({ session, id, onRead, onUnavailable }) {
    const [items, setItems] = useState([]);
    const [peer, setPeer] = useState(null);
    const [peerRead, setPeerRead] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [blocked, setBlocked] = useState(false);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [older, setOlder] = useState(false);
    const [moreBusy, setMoreBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const [files, setFiles] = useState([]);
    const chooser = useRef(null);
    const previewUrls = useRef(new Set());
    const [replyId, setReplyId] = useState(null);
    const [forwarding, setForwarding] = useState(null);
    const known = useRef([]);
    const replyTarget = items.find((item) => item.id === replyId);
    const validReply = !replyId || Boolean(replyTarget && !replyTarget.deleted);
    const pending = useRef(false);
    const retry = useRef(null);
    const last = useRef(0);
    const readMarker = useRef(0);
    const bottom = useRef(null);
    const scroller = useRef(null);
    const nearBottom = useRef(true);
    const initial = useRef(true);
    useEffect(() => {
        const controller = new AbortController();
        let running = false;
        let active = true;
        // Cleanup aborts this history request when the user switches to another conversation.
        async function load() {
            if (running || document.hidden) return;
            running = true;
            try {
                const result = await getMessages(session.token, id, {
                    ...(last.current ? { after: last.current } : {}),
                    signal: controller.signal,
                });
                if (!active) return;
                if (initial.current) {
                    setPeer(await getDisplayUser(session.token, result.peer_id, controller.signal));
                    setOlder(result.has_more);
                    initial.current = false;
                }
                const changes = [];
                for (let index = 0; index < known.current.length; index += 100)
                    changes.push(
                        ...(await syncMessages(
                            session.token,
                            id,
                            known.current.slice(index, index + 100),
                            controller.signal,
                        )),
                    );
                if (!active) return;
                setPeerRead(result.peer_read_id);
                setItems((previous) => {
                    const combined = [
                        ...previous,
                        ...result.data.filter(
                            (row) => !previous.some((item) => item.id === row.id),
                        ),
                    ];
                    const updated = combined.map(
                        (item) => changes.find((change) => change.id === item.id) || item,
                    );
                    known.current = updated.map((item) => item.id);
                    return updated.sort((a, b) => a.id - b.id);
                });
                if (result.data.length)
                    last.current = Math.max(last.current, ...result.data.map((row) => row.id));
                setError('');
                setBlocked(false);
                if (last.current > readMarker.current && document.hasFocus()) {
                    const marker = last.current;
                    await markRead(session.token, id, marker);
                    readMarker.current = marker;
                    if (active) onRead();
                }
            } catch (e) {
                if (active && !controller.signal.aborted) {
                    setError(e.message);
                    if ([403, 404].includes(e.status)) {
                        setBlocked(true);
                        setItems([]);
                        last.current = 0;
                        initial.current = true;
                        onUnavailable();
                    }
                }
            } finally {
                running = false;
                if (active) setLoading(false);
            }
        }
        load();
        const timer = setInterval(load, 4000);
        const visible = () => {
            if (!document.hidden) load();
        };
        document.addEventListener('visibilitychange', visible);
        window.addEventListener('focus', visible);
        return () => {
            active = false;
            controller.abort();
            clearInterval(timer);
            document.removeEventListener('visibilitychange', visible);
            window.removeEventListener('focus', visible);
        };
    }, [session.token, id, revision, onRead, onUnavailable]);
    useEffect(() => {
        if (nearBottom.current) bottom.current?.scrollIntoView({ block: 'nearest' });
    }, [items]);
    async function more() {
        if (moreBusy) return;
        setMoreBusy(true);
        const element = scroller.current;
        const height = element.scrollHeight;
        try {
            const result = await getMessages(session.token, id, { before: items[0].id });
            nearBottom.current = false;
            setItems((previous) => [
                ...result.data.filter((row) => !previous.some((item) => item.id === row.id)),
                ...previous,
            ]);
            known.current = [...new Set([...known.current, ...result.data.map((item) => item.id)])];
            setOlder(result.has_more);
            requestAnimationFrame(() => {
                element.scrollTop += element.scrollHeight - height;
            });
        } catch (e) {
            setError(e.message);
        } finally {
            setMoreBusy(false);
        }
    }
    useEffect(() => {
        const allocated = previewUrls.current;
        return () => {
            for (const url of allocated) URL.revokeObjectURL(url);
        };
    }, []);
    function clearFiles() {
        for (const entry of files) {
            URL.revokeObjectURL(entry.preview);
            previewUrls.current.delete(entry.preview);
        }
        setFiles([]);
        if (chooser.current) chooser.current.value = '';
    }
    function choose(selected) {
        const all = [...files.map((entry) => entry.file), ...Array.from(selected)];
        if (!all.length) return;
        const videos = all.filter((file) => file.type.startsWith('video/'));
        if (all.length > 5 || (videos.length && (videos.length !== 1 || all.length !== 1))) {
            setError('Choose up to five photos or one video');
            return;
        }
        if (
            all.some(
                (file) =>
                    !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(
                        file.type,
                    ) || file.size > (file.type.startsWith('image/') ? 10 : 50) * 1024 * 1024,
            )
        ) {
            setError('Use JPG/PNG/WebP up to 10 MB each, or MP4/WebM up to 50 MB');
            return;
        }
        clearFiles();
        setFiles(
            all.map((file) => {
                const preview = URL.createObjectURL(file);
                previewUrls.current.add(preview);
                return { file, preview, key: crypto.randomUUID() };
            }),
        );
        setError('');
    }
    function removeFile(key) {
        const entry = files.find((item) => item.key === key);
        URL.revokeObjectURL(entry.preview);
        previewUrls.current.delete(entry.preview);
        setFiles((previous) => previous.filter((item) => item.key !== key));
        if (chooser.current) chooser.current.value = '';
    }
    // Send the draft with its optional reply target and selected attachments.
    async function send(event) {
        event.preventDefault();
        const content = draft.trim();
        if (!validReply || pending.current || (!content && !files.length) || blocked) return;
        pending.current = true;
        setSending(true);
        setError('');
        const signature = JSON.stringify([content, files.map((entry) => entry.key), replyId]);
        if (!retry.current || retry.current.signature !== signature)
            retry.current = { signature, id: crypto.randomUUID() };
        try {
            const message = await sendMessage(session.token, id, content, retry.current.id, {
                files: files.map((entry) => entry.file),
                replyTo: replyId,
            });
            nearBottom.current = true;
            known.current = [...new Set([...known.current, message.id])];
            setItems((previous) =>
                previous.some((item) => item.id === message.id)
                    ? previous
                    : [...previous, message].sort((a, b) => a.id - b.id),
            );
            setDraft('');
            setReplyId(null);
            clearFiles();
            retry.current = null;
            onRead();
        } catch (e) {
            setError(
                e.name === 'TimeoutError' || e instanceof TypeError
                    ? 'Could not confirm delivery. Send again to retry safely.'
                    : e.message,
            );
            if ([403, 404].includes(e.status)) {
                setBlocked(true);
                setItems([]);
                onUnavailable();
            }
        } finally {
            pending.current = false;
            setSending(false);
        }
    }
    function updateMessage(message) {
        setItems((previous) => previous.map((item) => (item.id === message.id ? message : item)));
        onRead();
    }
    return (
        <section className="wc-chat" aria-label="Conversation">
            <header>
                {peer && (
                    <>
                        <Avatar name={peer.name} id={peer.id} token={session.token} />
                        <ProfileLink username={peer.username}>
                            <strong>{peer.name}</strong>
                            <small>@{peer.username}</small>
                        </ProfileLink>
                    </>
                )}
                <span>Friends only</span>
            </header>
            <div
                className="wc-chat-scroll"
                ref={scroller}
                onScroll={(event) => {
                    const element = event.currentTarget;
                    nearBottom.current =
                        element.scrollHeight - element.scrollTop - element.clientHeight < 100;
                }}
            >
                {loading ? (
                    <p role="status">Loading conversation…</p>
                ) : (
                    older &&
                    items.length > 0 && (
                        <button className="wc-chat-older" disabled={moreBusy} onClick={more}>
                            {moreBusy ? 'Loading…' : 'Older messages'}
                        </button>
                    )
                )}
                {!loading && !items.length && !blocked && !error && (
                    <div className="wc-chat-empty">
                        <span>✳</span>
                        <h2>A hello goes a long way.</h2>
                        <p>Send your friend the first message.</p>
                    </div>
                )}
                {items.map((item, index) => {
                    const mine = item.sender_id === session.user.id;
                    return (
                        <div
                            key={item.id}
                            id={'chat-message-' + item.id}
                            className={`wc-message ${mine ? 'mine' : ''}`}
                        >
                            {item.deleted ? (
                                <p className="wc-message-deleted">Message deleted</p>
                            ) : (
                                <>
                                    {item.forwarded && (
                                        <span className="wc-forwarded-label">↪ Forwarded</span>
                                    )}
                                    {item.reply && (
                                        <blockquote className="wc-message-quote">
                                            <strong>
                                                {item.reply.sender_id === session.user.id
                                                    ? 'You'
                                                    : peer?.name || 'Your friend'}
                                            </strong>
                                            <span>
                                                {item.reply.deleted
                                                    ? 'Message deleted'
                                                    : item.reply.content ||
                                                      (item.reply.kind === 'post'
                                                          ? 'Shared post'
                                                          : item.reply.kind === 'video'
                                                            ? 'Video'
                                                            : 'Photo')}
                                            </span>
                                        </blockquote>
                                    )}
                                    <MessageContent
                                        message={item}
                                        conversationId={id}
                                        session={session}
                                    />
                                    {item.content && <p>{item.content}</p>}
                                    {item.reactions?.length > 0 && (
                                        <div className="wc-message-reactions">
                                            {item.reactions.map((reaction) => (
                                                <button
                                                    key={reaction.type}
                                                    className={reaction.mine ? 'mine' : ''}
                                                    aria-label={
                                                        (reaction.mine
                                                            ? 'Remove your '
                                                            : 'React with ') +
                                                        reaction.type +
                                                        ' reaction'
                                                    }
                                                    onClick={async () => {
                                                        try {
                                                            updateMessage(
                                                                await reactToMessage(
                                                                    session.token,
                                                                    id,
                                                                    item.id,
                                                                    reaction.mine
                                                                        ? null
                                                                        : reaction.type,
                                                                ),
                                                            );
                                                        } catch (e) {
                                                            setError(e.message);
                                                        }
                                                    }}
                                                >
                                                    <ReactionIcon
                                                        name={
                                                            REACTIONS.find(
                                                                (option) =>
                                                                    option.type === reaction.type,
                                                            )?.icon || 'like'
                                                        }
                                                        size={17}
                                                        colored
                                                    />
                                                    <span>{reaction.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="wc-message-meta">
                                <small>
                                    <RelativeTime value={item.created_at} />
                                    {!item.deleted && mine && index === items.length - 1 && (
                                        <span> · {peerRead >= item.id ? 'Seen' : 'Sent'}</span>
                                    )}
                                </small>
                                {!item.deleted && (
                                    <MessageActions
                                        message={item}
                                        session={session}
                                        conversationId={id}
                                        onReply={(messageId) => {
                                            setReplyId(messageId);
                                            document.getElementById('message-draft')?.focus();
                                        }}
                                        onForward={setForwarding}
                                        onUpdate={updateMessage}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottom} />
            </div>
            {error && (
                <div className="wc-chat-error" role="alert">
                    <p>{error}</p>
                    {!blocked && (
                        <button onClick={() => setRevision((value) => value + 1)}>
                            Retry connection
                        </button>
                    )}
                </div>
            )}
            {replyId && (
                <div className="wc-reply-composer">
                    <div>
                        <strong>
                            {validReply
                                ? 'Replying to ' +
                                  (replyTarget.sender_id === session.user.id
                                      ? 'yourself'
                                      : peer?.name || 'your friend')
                                : 'Original message deleted'}
                        </strong>
                        <small>
                            {validReply
                                ? replyTarget.content.slice(0, 100) || 'Media or shared post'
                                : 'Cancel this reply to send a new message.'}
                        </small>
                    </div>
                    <button
                        aria-label="Cancel message reply"
                        disabled={sending}
                        onClick={() => setReplyId(null)}
                    >
                        ×
                    </button>
                </div>
            )}
            <div className="wc-dm-upload-previews">
                {files.map((entry) => (
                    <div key={entry.key}>
                        {entry.file.type.startsWith('video/') ? (
                            <VideoPlayer
                                src={entry.preview}
                                label="Video preview"
                                watermark={false}
                            />
                        ) : (
                            <img src={entry.preview} alt="Selected attachment" />
                        )}
                        <button
                            disabled={sending}
                            aria-label="Remove attachment"
                            onClick={() => removeFile(entry.key)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
            <form className="wc-message-composer" onSubmit={send}>
                <input
                    ref={chooser}
                    type="file"
                    hidden
                    multiple
                    accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                    onChange={(event) => choose(event.target.files)}
                />
                <button
                    className="wc-attach-button"
                    type="button"
                    aria-label="Attach photos or video"
                    disabled={blocked || loading || sending}
                    onClick={() => chooser.current.click()}
                >
                    ＋
                </button>
                <label className="visually-hidden" htmlFor="message-draft">
                    Message
                </label>
                <textarea
                    id="message-draft"
                    rows={2}
                    maxLength={4000}
                    placeholder={blocked ? 'Messaging is unavailable' : 'Write a message…'}
                    value={draft}
                    disabled={blocked || loading || sending}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (
                            event.key === 'Enter' &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                        ) {
                            event.preventDefault();
                            event.currentTarget.form.requestSubmit();
                        }
                    }}
                />
                <button
                    disabled={
                        blocked ||
                        loading ||
                        sending ||
                        !validReply ||
                        (!draft.trim() && !files.length)
                    }
                    aria-label="Send message"
                >
                    {sending ? '…' : <Icon name="arrow" />}
                </button>
                <small>{draft.length}/4000 · Enter to send, Shift + Enter for a new line</small>
            </form>
            {forwarding && (
                <ForwardMessageDialog
                    message={forwarding}
                    conversationId={id}
                    token={session.token}
                    onClose={() => setForwarding(null)}
                />
            )}
        </section>
    );
}
