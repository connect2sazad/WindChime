import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../shared/components/Avatar.jsx';
import { getConnections, getRelationship, getUsers, followUser, respondFriendRequest, sendFriendRequest, unfriend, unfollowUser } from '../../modules/social/api/connections.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';
import styles from '../../styles/connections.styles.js';

const tabs = [
    { key: 'incoming', label: 'Requests' },
    { key: 'friends', label: 'Friends' },
    { key: 'find', label: 'Find people' },
];

export default function ConnectionsScreen() {
    const tabSwipe = useMainTabSwipe('/(main)/connections');
    const { session } = useSession();
    const [view, setView] = useState('incoming');
    const [query, setQuery] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState('');

    const load = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            if (view === 'find') {
                const result = await getUsers(session.token, query.trim(), signal);
                const candidates = (result.data || []).filter((user) => user.id !== session.user.id);
                const enriched = await Promise.all(candidates.map(async (user) => {
                    try {
                        const [relationship, avatar] = await Promise.all([
                            getRelationship(session.token, user.id, signal),
                            getDisplayUser(session.token, user.id, signal),
                        ]);
                        return { ...avatar, relationship: relationship.data };
                    } catch { return { ...user, relationship: null }; }
                }));
                setRows(enriched);
            } else {
                const result = await getConnections(session.token, view, '', signal);
                const enriched = await Promise.all((result.data || []).map(async (connection) => {
                    try { return { ...connection, user: await getDisplayUser(session.token, connection.user_id, signal) }; }
                    catch { return { ...connection, user: { id: connection.user_id, name: 'WindChime member' } }; }
                }));
                setRows(enriched);
            }
        } catch (cause) {
            if (!signal?.aborted) setError(cause.message || 'Could not load connections.');
        } finally { if (!signal?.aborted) setLoading(false); }
    }, [query, session.token, session.user.id, view]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        const timer = setTimeout(() => load(controller.signal), view === 'find' ? 250 : 0);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [load]));

    async function act(row, action) {
        setBusyId(row.id); setError('');
        try {
            if (action === 'accept' || action === 'reject') await respondFriendRequest(session.token, row.id, action);
            else if (action === 'unfriend') await unfriend(session.token, row.id);
            else if (action === 'request') await sendFriendRequest(session.token, row.id);
            else if (action === 'follow') await followUser(session.token, row.id);
            else if (action === 'unfollow') await unfollowUser(session.token, row.id);
            await load();
        } catch (cause) { setError(cause.message || 'That connection update failed.'); }
        finally { setBusyId(null); }
    }

    function renderRow(item) {
        const user = item.user || item;
        const incoming = view === 'incoming';
        const found = view === 'find';
        const relationship = item.relationship;
        const friendship = relationship?.friendship;
        const outgoing = friendship?.status === 'pending' && friendship.requester_id === session.user.id;
        const friend = friendship?.status === 'accepted';
        const following = relationship?.following;
        const busy = busyId === item.id;
        return (
            <View style={styles.row}>
                <Pressable onPress={() => user.username && router.push(`/profiles/${user.username}`)}><Avatar user={user} token={session.token} size={42} style={styles.avatar} /></Pressable>
                <Pressable style={styles.details} onPress={() => user.username && router.push(`/profiles/${user.username}`)}><Text style={styles.name} numberOfLines={1}>{user.name || 'WindChime member'}</Text><Text style={styles.handle}>@{user.username || 'member'}</Text>{incoming ? <Text style={styles.note}>Wants to connect with you</Text> : null}</Pressable>
                {incoming ? (
                    <View style={styles.actions}>
                        <Action title="Accept" disabled={busy} onPress={() => act(item, 'accept')} />
                        <Action title="Decline" light disabled={busy} onPress={() => act(item, 'reject')} />
                    </View>
                ) : found ? (
                    <View style={styles.actions}>
                        <Action title={friend ? 'Friends' : outgoing ? 'Requested' : 'Add'} light={friend || outgoing} disabled={busy || friend || outgoing} onPress={() => act(item, 'request')} />
                        <Action title={following ? 'Following' : 'Follow'} light={following} disabled={busy} onPress={() => act(item, following ? 'unfollow' : 'follow')} />
                    </View>
                ) : <Action title="Unfriend" light disabled={busy} onPress={() => act(item, 'unfriend')} />}
            </View>
        );
    }

    return (
        <SafeAreaView {...tabSwipe} style={styles.screen} edges={['top']}>
            <FlatList
                data={rows}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={<>
                    <Text style={styles.brand}>windchime ✳</Text>
                    <Text style={styles.title}>Your people</Text>
                    <Text style={styles.subtitle}>Build your corner one hello at a time.</Text>
                    <View style={styles.tabs}>{tabs.map((tab) => <Pressable key={tab.key} onPress={() => setView(tab.key)} style={[styles.tab, view === tab.key && styles.tabActive]}><Text style={[styles.tabText, view === tab.key && styles.tabTextActive]}>{tab.label}</Text></Pressable>)}</View>
                    {view === 'find' ? <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search name or username" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} /> : null}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Finding your people…</Text></View> : null}
                </>}
                renderItem={({ item }) => renderRow(item)}
                ListEmptyComponent={!loading && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>{view === 'incoming' ? 'No requests right now' : view === 'friends' ? 'Your friend list is growing' : 'No people found'}</Text><Text style={styles.muted}>{view === 'find' ? 'Try a different name or username.' : 'Check back when someone reaches out.'}</Text></View> : null}
            />
        </SafeAreaView>
    );
}

function Action({ title, onPress, light = false, disabled = false }) {
    return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.action, light && styles.actionLight, disabled && { opacity: 0.58 }]}><Text style={[styles.actionText, light && styles.actionTextLight]}>{title}</Text></Pressable>;
}
