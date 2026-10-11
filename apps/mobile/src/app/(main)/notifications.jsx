import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../modules/notifications/api/notifications.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/notifications.styles.js';

const messageFor = (type) => ({
    'friend.request': 'sent you a friend request',
    'friend.accepted': 'accepted your friend request',
    'follow.created': 'started following you',
    'post.comment': 'commented on your post',
    'comment.reply': 'replied to your comment',
    'post.reaction': 'reacted to your post',
    'comment.reaction': 'reacted to your comment',
    'post.reshare': 'reshared your post',
    'message.created': 'sent you a message',
    'message.reaction': 'reacted to your message',
}[type] || 'sent you a notification');

export default function NotificationsScreen() {
    const { session } = useSession();
    const [rows, setRows] = useState([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const result = await getNotifications(session.token, signal);
            const enriched = await Promise.all((result.data || []).map(async (notification) => {
                try { return { ...notification, actor: await getDisplayUser(session.token, notification.actor_id, signal) }; }
                catch { return { ...notification, actor: { name: 'WindChime member' } }; }
            }));
            setRows(enriched);
            setUnread(result.unread_count || 0);
        } catch (cause) { if (!signal?.aborted) setError(cause.message || 'Could not load notifications.'); }
        finally { if (!signal?.aborted) setLoading(false); }
    }, [session.token]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]));

    async function markOne(item) {
        if (item.read_at) return;
        try {
            await markNotificationRead(session.token, item.id);
            setRows((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
            setUnread((count) => Math.max(0, count - 1));
        } catch (cause) { setError(cause.message || 'Could not mark notification as read.'); }
    }

    async function markAll() {
        if (!unread || !rows.length) return;
        try {
            await markAllNotificationsRead(session.token, Math.max(...rows.map((row) => row.id)));
            setRows((current) => current.map((row) => ({ ...row, read_at: row.read_at || new Date().toISOString() })));
            setUnread(0);
        } catch (cause) { setError(cause.message || 'Could not mark notifications as read.'); }
    }

    return (
        <View style={styles.screen}>
            <FlatList
                data={rows}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.content}
                ListHeaderComponent={<>
                    <View style={styles.top}><Text style={styles.brand}>windchime <Text style={styles.mark}>✳</Text></Text>{unread > 0 ? <Pressable style={styles.clear} onPress={markAll}><Text style={styles.clearText}>Mark all read</Text></Pressable> : null}</View>
                    <Text style={styles.title}>Notifications</Text>
                    <Text style={styles.subtitle}>{unread ? `${unread} new updates from your corner.` : 'You’re up to date.'}</Text>
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {loading && !rows.length ? <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.centerText}>Checking what’s new…</Text></View> : null}
                </>}
                renderItem={({ item }) => <Pressable onPress={() => markOne(item)} style={[styles.row, !item.read_at && styles.unreadRow]}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{(item.actor?.name || 'W').trim().slice(0, 1).toUpperCase()}</Text></View>
                    <View style={styles.body}><Text style={styles.message}><Text style={{ fontWeight: '800' }}>{item.actor?.name || 'WindChime member'}</Text> {messageFor(item.type)}</Text><Text style={styles.time}>{new Date(item.occurred_at || item.created_at).toLocaleString()}</Text></View>
                    {!item.read_at ? <View style={styles.unreadDot} /> : null}
                </Pressable>}
                ListEmptyComponent={!loading && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>Your corner is quiet.</Text><Text style={styles.emptyText}>New friend requests and conversations will show up here.</Text></View> : null}
            />
        </View>
    );
}
