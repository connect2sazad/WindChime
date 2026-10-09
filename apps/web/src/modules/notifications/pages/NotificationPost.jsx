import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPost } from '../../posts/api/index.js';
import { getDisplayUser } from '../../profiles/api/index.js';
import CommentsPanel from '../../comments/index.js';
// Resolves the post linked by a notification and displays it if it is still available.
export default function NotificationPost({ session }) {
    const { post_id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [error, setError] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const value = await getPost(session.token, Number(post_id), controller.signal);
                const actor = await getDisplayUser(
                    session.token,
                    value.creator_id,
                    controller.signal,
                );
                if (!controller.signal.aborted)
                    setPost({ ...value, name: actor.name, username: actor.username });
            } catch (e) {
                if (!controller.signal.aborted)
                    setError(e.status === 404 ? 'This post is no longer available.' : e.message);
            }
        }
        load();
        return () => controller.abort();
    }, [post_id, session.token]);
    return (
        <main className="wc-notifications-page">
            <button onClick={() => navigate('/notifications')}>← Back to notifications</button>
            {error ? (
                <p role="alert">{error}</p>
            ) : !post ? (
                <p role="status">Opening the conversation…</p>
            ) : (
                <CommentsPanel
                    post={post}
                    token={session.token}
                    currentUser={session.user}
                    onClose={() => navigate('/notifications')}
                />
            )}
        </main>
    );
}
