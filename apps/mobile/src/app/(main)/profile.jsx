import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getConnections } from '../../modules/social/api/connections.js';
import { getDisplayUser, getUserPosts, getUserReshares } from '../../modules/social/api/feed.js';
import Avatar from '../../shared/components/Avatar.jsx';
import Skeleton from '../../shared/components/Skeleton.jsx';
import ProfilePostCard from '../../modules/social/components/ProfilePostCard.jsx';
import { ReelViewer } from '../../modules/social/components/ReelExperience.jsx';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/profile.styles.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';

export default function ProfileScreen() {
    const tabSwipe = useMainTabSwipe('/(main)/profile');
    const { session, signOut } = useSession();
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
    const [activeReelId, setActiveReelId] = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

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
    const profileReels = posts.filter((post) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video')).map((post) => ({ ...post, author: post.author || user }));

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
        <>
        <SafeAreaView {...tabSwipe} style={styles.screen} edges={['top']}>
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.cover}><Text style={styles.coverEyebrow}>YOUR LITTLE CORNER OF WINDCHIME</Text><Text style={styles.coverMark}>✳</Text></View>
                <View style={styles.profileCard}>
                    <View style={styles.identityRow}>
                        <Avatar user={user} token={session.token} size={70} style={styles.avatar} />
                        <View style={styles.identity}><Text style={styles.name} numberOfLines={1}>{user.name || 'WindChime member'}</Text><Text style={styles.username}>@{user.username || 'member'}</Text></View>
                        <Pressable style={styles.editButton} onPress={() => router.push('/(main)/profile-edit')}><Text style={styles.editButtonText}>Edit profile</Text></Pressable>
                        <Pressable onPress={() => setSettingsOpen(true)} accessibilityRole="button" accessibilityLabel="Open profile settings" style={{ width: 40, height: 40, marginLeft: 7, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}><SymbolView name={{ ios: 'line.3.horizontal', android: 'menu', web: 'menu' }} tintColor={colors.ink} size={20} /></Pressable>
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
                    <Pressable onPress={() => router.push('/(main)/saved')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}><SymbolView name={{ ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }} tintColor={colors.green} size={18} /><Text style={{ color: colors.green, fontWeight: '700', fontSize: 13 }}>Saved moments</Text></Pressable>
                </View>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 7, marginTop: 20, marginBottom: 10 }}>
                    {PROFILE_TABS.map(([value, label]) => <Pressable key={value} onPress={() => setContentTab(value)} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, backgroundColor: contentTab === value ? colors.ink : '#e9eee4' }}><Text style={{ color: contentTab === value ? colors.white : colors.ink, fontWeight: '700', fontSize: 10 }}>{label}</Text></Pressable>)}
                </ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
                    {[
                        ['grid', 'square.grid.2x2.fill', 'grid_view', 'Grid view'],
                        ['list', 'rectangle.stack.fill', 'view_agenda', 'List view'],
                    ].map(([value, ios, android, label]) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: layout === value }} onPress={() => setLayout(value)} style={{ width: 42, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: layout === value ? '#dce9d3' : colors.white, borderWidth: 1, borderColor: colors.border }}><SymbolView name={{ ios, android, web: android }} tintColor={colors.ink} size={18} /></Pressable>)}
                </View>
                <View style={styles.sectionRow}><Text style={styles.sectionTitle}>Your moments</Text><Text style={styles.sectionHint}>{stats.posts} shared</Text></View>
                {loading ? <Skeleton variant="feed" count={2} /> : posts.length ? <View style={layout === 'grid' ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : null}>{posts.map((post) => <ProfilePostCard key={post.id} post={post} token={session.token} layout={layout} onOpenReel={setActiveReelId} author={user} />)}</View> : <Text style={styles.empty}>{contentTab === 'all' ? 'Your first shared moment will appear here.' : `No ${contentTab} to show yet.`}</Text>}
                {hasMorePosts ? <Pressable disabled={busy} onPress={loadMorePosts} style={styles.button}>{busy ? <Skeleton variant="inline" /> : <Text style={styles.buttonText}>Load more posts</Text>}</Pressable> : null}
            </ScrollView>
        </SafeAreaView>
        <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
            <Pressable onPress={() => setSettingsOpen(false)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,28,30,.42)' }}>
                <Pressable onPress={(event) => event.stopPropagation()} style={{ backgroundColor: colors.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 }}>
                    <View style={{ width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 }} />
                    <Text style={{ color: colors.ink, fontSize: 21, fontWeight: '800', marginBottom: 4 }}>Settings and activity</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>Manage your account and what you’ve shared.</Text>
                    <SettingsRow icon="person.crop.circle" android="account_circle" label="Edit profile" onPress={() => { setSettingsOpen(false); router.push('/(main)/profile-edit'); }} />
                    <SettingsRow icon="lock" android="lock" label="Reset password" hint="We’ll email a secure reset code" onPress={() => { setSettingsOpen(false); router.push('/forgot-password'); }} />
                    <SettingsRow icon="hand.raised" android="block" label="Blocked accounts" onPress={() => { setSettingsOpen(false); router.push('/(main)/blocked'); }} />
                    <SettingsRow icon="bookmark" android="bookmark_border" label="Saved moments" onPress={() => { setSettingsOpen(false); router.push('/(main)/saved'); }} />
                    <SettingsRow icon="square.stack" android="history" label="Your posts" onPress={() => { setSettingsOpen(false); setContentTab('all'); }} />
                    <SettingsRow icon="heart" android="favorite_border" label="Liked moments" hint="Activity history isn’t available yet" disabled />
                    <SettingsRow icon="play.rectangle" android="video_library" label="Reels history" hint="Viewing history isn’t available yet" disabled />
                    <Pressable disabled={busy} onPress={() => { setSettingsOpen(false); leave(); }} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.border, marginTop: 4 }}><SymbolView name={{ ios: 'rectangle.portrait.and.arrow.right', android: 'logout', web: 'logout' }} tintColor={colors.danger} size={19} /><Text style={{ color: colors.danger, fontWeight: '800' }}>{busy ? 'Signing out…' : 'Log out'}</Text></Pressable>
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </Pressable>
            </Pressable>
        </Modal>
        <ReelViewer visible={activeReelId !== null} posts={profileReels} initialPostId={activeReelId} token={session.token} onActiveChange={setActiveReelId} onClose={() => setActiveReelId(null)} />
        </>
    );
}

function Stat({ count, label }) {
    return <View style={styles.stat}><Text style={styles.statValue}>{count}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function SettingsRow({ icon, android, label, hint, disabled, onPress }) {
    return <Pressable disabled={disabled} onPress={onPress} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: 1, borderTopColor: colors.border, opacity: disabled ? 0.55 : 1 }}>
        <SymbolView name={{ ios: icon, android, web: android }} tintColor={colors.green} size={20} />
        <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 14, fontWeight: '700' }}>{label}</Text>{hint ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>{hint}</Text> : null}</View>
        {!disabled ? <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} tintColor={colors.muted} size={16} /> : null}
    </Pressable>;
}

const PROFILE_TABS = [['all', 'All'], ['text', 'Text'], ['photos', 'Photos'], ['videos', 'Videos'], ['reels', 'Reels'], ['reshares', 'Reshares']];
