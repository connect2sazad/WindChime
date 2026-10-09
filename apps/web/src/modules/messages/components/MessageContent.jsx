import { useEffect, useRef, useState } from 'react';
import VideoPlayer from '../../../shared/components/VideoPlayer.jsx';
import { getMessageMedia, getSharedPost } from '../api/index.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import PostMediaView from '../../posts/Media.js';
import CommentsPanel from '../../comments/index.js';
function Attachment({ file, messageId, conversationId, token }) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [large, setLarge] = useState(false);
    const dialog = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        let objectUrl;
        getMessageMedia(token, conversationId, messageId, file.index, controller.signal)
            .then((blob) => {
                if (!controller.signal.aborted) {
                    objectUrl = URL.createObjectURL(blob);
                    setUrl(objectUrl);
                }
            })
            .catch((e) => {
                if (!controller.signal.aborted) setError(e.message);
            });
        return () => {
            controller.abort();
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [token, conversationId, messageId, file.index]);
    useEffect(() => {
        if (!large) return;
        dialog.current.showModal();
    }, [large]);
    if (error) return <p className="wc-chat-media-error">Attachment unavailable: {error}</p>;
    if (!url)
        return (
            <span className="wc-chat-media-loading" role="status">
                Loading {file.kind}…
            </span>
        );
    return (
        <>
            {file.kind === 'video' ? (
                <VideoPlayer src={url} label="Chat video" />
            ) : (
                <button
                    type="button"
                    className="wc-chat-photo"
                    aria-label="View photo"
                    onClick={() => setLarge(true)}
                >
                    <img
                        src={url}
                        alt="Shared in this conversation"
                        onError={() => setError('Image could not be displayed')}
                    />
                </button>
            )}
            {large && (
                <dialog
                    ref={dialog}
                    className="wc-photo-dialog"
                    onCancel={() => setLarge(false)}
                    onClick={(event) => {
                        if (event.target === event.currentTarget) setLarge(false);
                    }}
                >
                    <button aria-label="Close photo" onClick={() => setLarge(false)}>
                        ×
                    </button>
                    <img src={url} alt="Shared in this conversation" />
                </dialog>
            )}
        </>
    );
}
function SharedPost({ message, conversationId, session }) {
    const [post, setPost] = useState(null);
    const [error, setError] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [refresh, setRefresh] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const data = await getSharedPost(
                    session.token,
                    conversationId,
                    message.id,
                    controller.signal,
                );
                const author = await getDisplayUser(
                    session.token,
                    data.creator_id,
                    controller.signal,
                );
                if (!controller.signal.aborted) {
                    setPost({ ...data, name: author.name, username: author.username });
                    setError('');
                }
            } catch (e) {
                if (!controller.signal.aborted) {
                    setPost(null);
                    setExpanded(false);
                    setError(e.message);
                }
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
    }, [session.token, conversationId, message.id, refresh]);
    async function open() {
        try {
            const data = await getSharedPost(session.token, conversationId, message.id);
            setPost((previous) => ({ ...previous, ...data }));
            setExpanded(true);
        } catch (e) {
            setError(e.message);
            setPost(null);
        }
    }
    if (error)
        return (
            <div className="wc-shared-post-unavailable">
                <strong>Shared post unavailable</strong>
                <small>{error}</small>
                <button onClick={() => setRefresh((value) => value + 1)}>Retry</button>
            </div>
        );
    if (!post) return <p role="status">Loading shared post…</p>;
    return (
        <div className="wc-shared-post">
            <small>Shared post</small>
            <strong>{post.name}</strong>
            <span>@{post.username}</span>
            <PostMediaView post={post} token={session.token} />
            {post.content && (
                <p>
                    {Array.from(post.content).slice(0, 200).join('')}
                    {post.content.length > 200 ? '…' : ''}
                </p>
            )}
            <button onClick={open}>View post →</button>
            {expanded && (
                <CommentsPanel
                    post={post}
                    token={session.token}
                    currentUser={session.user}
                    onClose={() => setExpanded(false)}
                />
            )}
        </div>
    );
}
// Renders the message body and delegates protected media or shared-post loading.
export default function MessageContent({ message, conversationId, session }) {
    return (
        <>
            {message.attachments?.length > 0 && (
                <div
                    className={`wc-chat-attachments ${message.attachments.length > 1 ? 'gallery' : ''}`}
                >
                    {message.attachments.map((file) => (
                        <Attachment
                            key={
                                session.token +
                                ':' +
                                conversationId +
                                ':' +
                                message.id +
                                ':' +
                                file.index
                            }
                            file={file}
                            token={session.token}
                            conversationId={conversationId}
                            messageId={message.id}
                        />
                    ))}
                </div>
            )}
            {message.shared_post_id && (
                <SharedPost message={message} conversationId={conversationId} session={session} />
            )}
        </>
    );
}
