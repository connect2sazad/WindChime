import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../shared/components/Avatar.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
import { getConversations } from '../../modules/messages/api/messages.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';
import styles from '../../styles/messages.styles.js';

export default function ChatsScreen() {
    const tabSwipe = useMainTabSwipe('/(main)/chats');
    const { session } = useSession();
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const peerCache = useRef(new Map());

    useEffect(() => {
        const timer = setTimeout(() => setSearch(query.trim()), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const load = useCallback(async (signal, quiet = false) => {
        if (!quiet) setLoading(true);
        setError('');
        try {
            const response = await getConversations(session.token, 1, search, signal);
            const items = await Promise.all((response.data || []).map(async (item) => {
                const cached = peerCache.current.get(item.peer_id);
                if (cached) return { ...item, peer: cached };
                let peer;
                try { peer = await getDisplayUser(session.token, item.peer_id, signal); }
                catch { peer = { id: item.peer_id, name: 'WindChime member', username: null }; }
                peerCache.current.set(item.peer_id, peer);
                return { ...item, peer };
            }));
            setRows(items);
        } catch (cause) {
            if (!signal?.aborted) setError(cause.message || 'Could not load your messages.');
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [search, session.token]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        load(controller.signal);
        const timer = setInterval(() => load(undefined, true), 6000);
        return () => { controller.abort(); clearInterval(timer); };
    }, [load]));

    return (
        <SafeAreaView {...tabSwipe} style={styles.screen} edges={['top']}>
            <FlatList
                data={rows}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={<>
                    <Text style={styles.brand}>windchime <Text style={styles.mark}>✳</Text></Text>
                    <Text style={styles.title}>Messages</Text>
                    <Text style={styles.subtitle}>Private conversations with your friends.</Text>
                    <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search a name or username" placeholderTextColor={colors.muted} autoCapitalize="none" />
                    {error ? <Pressable onPress={() => load()} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tap to try again</Text></Pressable> : null}
                    {loading && !rows.length ? <View style={styles.center}><ActivityIndicator color={colors.green} /><Text style={styles.centerText}>Loading conversations…</Text></View> : null}
                </>}
                renderItem={({ item }) => <Pressable style={styles.row} onPress={() => router.push({ pathname: '/conversations/[id]', params: { id: String(item.id), peer_id: String(item.peer_id) } })}>
                    <Avatar user={item.peer} token={session.token} size={48} style={styles.avatar} />
                    <View style={styles.rowBody}><Text style={styles.person} numberOfLines={1}>{item.peer?.name || 'WindChime member'}</Text><Text style={styles.handle} numberOfLines={1}>{item.peer?.username ? `@${item.peer.username}` : 'Your friend'}</Text><Text style={styles.lastMessage} numberOfLines={1}>{item.last_message?.content || (item.last_message?.shared_post_id ? 'Shared a post' : 'Say hello')}{item.last_message?.created_at ? ` · ${relativeTime(item.last_message.created_at)}` : ''}</Text></View>
                    {item.unread > 0 ? <View style={styles.unread}><Text style={styles.unreadText}>{item.unread}</Text></View> : null}
                </Pressable>}
                ListEmptyComponent={!loading && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>{search ? 'No matches yet.' : 'Your conversations start here.'}</Text><Text style={styles.emptyText}>{search ? 'Try another name or username.' : 'You can message people after you become friends.'}</Text></View> : null}
            />
        </SafeAreaView>
    );
}
