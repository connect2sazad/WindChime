import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getConnections } from '../../modules/social/api/connections.js';
import { getDisplayUser, getMediaUrl, getUserPosts, getUserReshares } from '../../modules/social/api/feed.js';
import { Image } from 'expo-image';
import Avatar from '../../shared/components/Avatar.jsx';
import MediaCarousel from '../../modules/social/components/MediaCarousel.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
import { useSession } from '../../shared/session/useSession.js';
import useUnreadNotifications from '../../modules/notifications/hooks/useUnreadNotifications.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/profile.styles.js';

export default function ProfileScreen() {
    const { session, signOut } = useSession();
    const unreadNotifications = useUnreadNotifications(session?.token);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState({ posts: 0, friends: 0, followers: 0, following: 0 });
    const [profileUser, setProfileUser] = useState(session.user);
    const [contentTab, setContentTab] = useState('all');
    const [layout, setLayout] = useState('list');
    const [page, setPage] = useState(1);
    const [hasMorePosts, setHasMorePosts] = useState(false);

    const load = useCallback(async (signal) => {
        setLoading(true);
        const [postResult, friendResult, followerResult, followingResult, userResult] = await Promise.allSettled([
            contentTab === 'reshares' ? getUserReshares(session.token, session.user.id, signal, 1) : getUserPosts(session.token, session.user.id, signal, 1, contentTab),
            getConnections(session.token, 'friends', '', signal),
            getConnections(session.token, 'followers', '', signal),
            getConnections(session.token, 'following', '', signal),
            getDisplayUser(session.token, session.user.id, signal),
        ]);
        if (signal?.aborted) return;
        const postResponse = postResult.status === 'fulfilled' ? postResult.value : null;
        setPosts(postResponse?.data || []);
        setPage(1);
        setHasMorePosts(Boolean(postResponse?.pagination?.has_next_page));
        if (userResult.status === 'fulfilled') setProfileUser(userResult.value);
        setStats({
            posts: postResponse?.pagination?.total ?? postResponse?.data?.length ?? 0,
            friends: friendResult.status === 'fulfilled' ? friendResult.value.pagination?.total || 0 : 0,
            followers: followerResult.status === 'fulfilled' ? followerResult.value.pagination?.total || 0 : 0,
            following: followingResult.status === 'fulfilled' ? followingResult.value.pagination?.total || 0 : 0,
        });
        setLoading(false);
    }, [contentTab, session.token, session.user.id]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]));

    if (!session) return <Redirect href="/login" />;

    async function leave() {
        setBusy(true); setError('');
        try { await signOut(); }
        catch (cause) { setError(cause.message || 'Signed out locally, but the server could not be reached.'); }
        finally { setBusy(false); }
    }

    const user = { ...session.user, ...profileUser };

    async function loadMorePosts() {
        if (!hasMorePosts || busy) return;
        setBusy(true); setError('');
        try {
            const nextPage = page + 1;
            const result = contentTab === 'reshares' ? await getUserReshares(session.token, user.id, undefined, nextPage) : await getUserPosts(session.token, user.id, undefined, nextPage, contentTab);
            setPosts((current) => [...current, ...(result.data || [])]);
            setPage(nextPage); setHasMorePosts(Boolean(result.pagination?.has_next_page));
        } catch (cause) { setError(cause.message || 'Could not load more posts.'); }
        finally { setBusy(false); }
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.top}><Text style={styles.brand}>windchime <Text style={styles.mark}>✳</Text></Text><Pressable style={styles.topAction} onPress={() => router.push('/(main)/notifications')}><Text style={styles.topActionText}>Notifications{unreadNotifications ? ` · ${unreadNotifications > 99 ? '99+' : unreadNotifications}` : ''}</Text></Pressable></View>
                <View style={styles.cover}><Text style={styles.coverEyebrow}>YOUR LITTLE CORNER OF WINDCHIME</Text><Text style={styles.coverMark}>✳</Text></View>
                <View style={styles.profileCard}>
                    <View style={styles.identityRow}>
                        <Avatar user={user} token={session.token} size={70} style={styles.avatar} />
                        <View style={styles.identity}><Text style={styles.name} numberOfLines={1}>{user.name || 'WindChime member'}</Text><Text style={styles.username}>@{user.username || 'member'}</Text></View>
                        <Pressable style={styles.editButton} onPress={() => router.push('/(main)/profile-edit')}><Text style={styles.editButtonText}>Edit profile</Text></Pressable>
                    </View>
                    {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : <Text style={styles.bio}>Your corner, your people, your moments.</Text>}
                    <View style={styles.stats}>
                        <Stat count={stats.posts} label="Posts" />
                        <Stat count={stats.friends} label="Friends" />
                        <Stat count={stats.followers} label="Followers" />
                        <Stat count={stats.following} label="Following" />
                    </View>
                    <View style={styles.links}>
                        <Pressable style={styles.link} onPress={() => router.push('/(main)/connections')}><Text style={styles.linkText}>Your people</Text></Pressable>
                        <Pressable style={styles.link} onPress={() => router.push('/(main)/chats')}><Text style={styles.linkText}>Messages</Text></Pressable>
                    </View>
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 7, marginTop: 20, marginBottom: 10 }}>
                    {PROFILE_TABS.map(([value, label]) => <Pressable key={value} onPress={() => setContentTab(value)} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: contentTab === value ? colors.ink : '#e9eee4' }}><Text style={{ color: contentTab === value ? colors.white : colors.ink, fontWeight: '700', fontSize: 10 }}>{label}</Text></Pressable>)}
                </ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
                    {['list', 'grid'].map((value) => <Pressable key={value} onPress={() => setLayout(value)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12, backgroundColor: layout === value ? '#dce9d3' : colors.white }}><Text style={{ color: colors.ink, fontSize: 11, fontWeight: '700' }}>{value === 'list' ? 'Full posts' : 'Tiles'}</Text></Pressable>)}
                </View>
                <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your moments</Text><Text style={styles.sectionHint}>{stats.posts} shared</Text></View>
                {loading ? <View style={styles.empty}><ActivityIndicator color={colors.green} /></View> : posts.length ? <View style={layout === 'grid' ? { flexDirection: 'row', flexWrap: 'wrap', gap: 5 } : null}>{posts.map((post) => layout === 'grid' ? <Pressable key={post.id} onPress={() => router.push(`/posts/${post.id}`)} style={{ width: '32%', aspectRatio: 0.9, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e7eee5' }}>{post.media?.[0] ? <Image source={{ uri: getMediaUrl(post.id, post.media[0].id), headers: { Authorization: `Bearer ${session.token}` } }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text numberOfLines={5} style={{ padding: 8, color: colors.ink, fontSize: 10 }}>{post.content || 'Shared a moment'}</Text>}{post.kind === 'reel' ? <Text style={{ position: 'absolute', right: 6, top: 4, color: colors.white, fontWeight: '900' }}>▶</Text> : null}</Pressable> : <View key={post.id} style={styles.post}><Text style={styles.postText}>{post.content || (post.media?.length ? 'Shared a photo or video' : 'Shared a moment')}</Text><MediaCarousel post={post} token={session.token} /><Text style={styles.postMeta}>{relativeTime(post.created_at)} ago · {post.kind === 'reel' ? 'Reel' : 'Post'}</Text></View>)}</View> : <Text style={styles.empty}>{contentTab === 'all' ? 'Your first shared moment will appear here.' : `No ${contentTab} to show yet.`}</Text>}
                {hasMorePosts ? <Pressable disabled={busy} onPress={loadMorePosts} style={styles.button}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Load more posts</Text>}</Pressable> : null}
                <Pressable disabled={busy} onPress={leave} style={[styles.signOut, busy && { opacity: 0.6 }]}>{busy ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.signOutText}>Sign out</Text>}</Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

function Stat({ count, label }) {
    return <View style={styles.stat}><Text style={styles.statValue}>{count}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const PROFILE_TABS = [['all', 'All'], ['text', 'Text'], ['photos', 'Photos'], ['videos', 'Videos'], ['reels', 'Reels'], ['reshares', 'Reshares']];
