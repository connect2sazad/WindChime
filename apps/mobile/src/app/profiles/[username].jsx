import { useCallback, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { IDENTITY_API } from '../../shared/config/services.js';
import { apiRequest } from '../../shared/api/request.js';
import { getRelationship, sendFriendRequest, followUser, unfollowUser, unfriend, getPublicConnections, respondFriendRequest, removeFollower } from '../../modules/social/api/connections.js';
import { getUserPosts, getUserReshares } from '../../modules/social/api/feed.js';
import { startConversation } from '../../modules/messages/api/messages.js';
import Avatar from '../../shared/components/Avatar.jsx';
import ProfilePostCard from '../../modules/social/components/ProfilePostCard.jsx';
import { ReelViewer } from '../../modules/social/components/ReelExperience.jsx';
import { blockUser, unblockUser, sendReport } from '../../modules/safety/api/safety.js';
import Skeleton from '../../shared/components/Skeleton.jsx';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';

export default function PublicProfileScreen() {
    const { username } = useLocalSearchParams();
    const { session } = useSession();
    const token = session?.token;
    const [profile, setProfile] = useState(null);
    const [relationship, setRelationship] = useState(null);
    const [posts, setPosts] = useState([]);
    const [postsPage, setPostsPage] = useState(1);
    const [postsHaveMore, setPostsHaveMore] = useState(false);
    const [postTotal, setPostTotal] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ friends: 0, followers: 0, following: 0 });
    const [profileTab, setProfileTab] = useState('all');
    const [layoutMode, setLayoutMode] = useState('list');
    const [activeReelId, setActiveReelId] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportReason, setReportReason] = useState('spam');

    const load = useCallback(async (signal) => {
        if (!token || !username) return;
        setLoading(true); setError('');
        try {
            const result = await apiRequest(IDENTITY_API, `/profiles/${encodeURIComponent(String(username))}`, { token, signal });
            const user = result.data;
            const [relation, feed, friends, followers, following] = await Promise.all([
                getRelationship(token, user.id, signal),
                profileTab === 'reshares' ? getUserReshares(token, user.id, signal) : getUserPosts(token, user.id, signal, 1, profileTab),
                getPublicConnections(token, user.id, 'friends', signal),
                getPublicConnections(token, user.id, 'followers', signal),
                getPublicConnections(token, user.id, 'following', signal),
            ]);
            if (signal?.aborted) return;
            setProfile(user); setRelationship(relation.data); setPosts(feed.data || []);
            setPostsPage(1); setPostsHaveMore(Boolean(feed.pagination?.has_next_page)); setPostTotal(feed.pagination?.total || feed.data?.length || 0);
            setStats({ friends: friends.pagination?.total || 0, followers: followers.pagination?.total || 0, following: following.pagination?.total || 0 });
        } catch (cause) { if (!signal?.aborted) setError(cause.message || 'Could not open this profile.'); }
        finally { if (!signal?.aborted) setLoading(false); }
    }, [profileTab, token, username]);

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]));

    if (!session) return <Redirect href="/login" />;

    async function update(action) {
        if (!profile || busy) return;
        setBusy(true); setError('');
        try {
            if (action === 'follow') await followUser(token, profile.id);
            if (action === 'unfollow') await unfollowUser(token, profile.id);
            if (action === 'friend') await sendFriendRequest(token, profile.id);
            if (action === 'unfriend') await unfriend(token, relationship.friendship.id);
            if (action === 'accept' || action === 'reject') await respondFriendRequest(token, relationship.friendship.id, action);
            const next = await getRelationship(token, profile.id);
            setRelationship(next.data);
        } catch (cause) { setError(cause.message || 'Could not update this connection.'); }
        finally { setBusy(false); }
    }

    async function messageUser() {
        if (!profile || busy || !friend) return;
        setBusy(true); setError('');
        try {
            const conversation = await startConversation(token, profile.id);
            router.push({ pathname: '/conversations/[id]', params: { id: String(conversation.id), peer_id: String(profile.id) } });
        } catch (cause) { setError(cause.message || 'Could not open this conversation.'); }
        finally { setBusy(false); }
    }

    async function toggleBlock() {
        if (!profile || busy) return;
        const blocked = Boolean(relationship?.blocked_by_me);
        if (!blocked) {
            Alert.alert('Block this account?', 'They will no longer be able to interact with you or see your moments.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => void applyBlock(true) },
            ]);
            return;
        }
        await applyBlock(false);
    }

    async function applyBlock(shouldBlock) {
        setBusy(true); setError('');
        try {
            if (shouldBlock) await blockUser(token, profile.id); else await unblockUser(token, profile.id);
            const result = await getRelationship(token, profile.id);
            setRelationship(result.data); setMenuOpen(false);
        } catch (cause) { setError(cause.message || 'Could not update this account’s block status.'); }
        finally { setBusy(false); }
    }

    async function submitReport() {
        if (!profile || busy) return;
        setBusy(true); setError('');
        try {
            await sendReport(token, { target_type: 'user', target_id: profile.id, reason: reportReason });
            setReportOpen(false);
            Alert.alert('Report sent', 'Thanks for helping keep WindChime safe.');
        } catch (cause) { setError(cause.message || 'Could not send the report.'); }
        finally { setBusy(false); }
    }

    async function removeConnection(action) {
        if (!profile || busy) return;
        setBusy(true); setError('');
        try {
            if (action === 'unfriend' && relationship?.friendship?.id) await unfriend(token, relationship.friendship.id);
            if (action === 'remove-follower') await removeFollower(token, profile.id);
            setRelationship((current) => ({ ...current, friendship: action === 'unfriend' ? null : current?.friendship, follows_you: action === 'remove-follower' ? false : current?.follows_you }));
            setMenuOpen(false);
        } catch (cause) { setError(cause.message || 'Could not update this connection.'); }
        finally { setBusy(false); }
    }

    async function loadMorePosts() {
        if (!profile || !postsHaveMore || busy) return;
        setBusy(true);
        try {
            const nextPage = postsPage + 1;
            const result = profileTab === 'reshares' ? await getUserReshares(token, profile.id, undefined, nextPage) : await getUserPosts(token, profile.id, undefined, nextPage, profileTab);
            setPosts((current) => [...current, ...(result.data || [])]);
            setPostsPage(nextPage); setPostsHaveMore(Boolean(result.pagination?.has_next_page));
        } catch (cause) { setError(cause.message || 'Could not load more posts.'); }
        finally { setBusy(false); }
    }

    const friend = relationship?.friendship?.status === 'accepted';
    const requested = relationship?.friendship?.status === 'pending' && relationship.friendship.requester_id === session.user.id;
    const incoming = relationship?.friendship?.status === 'pending' && relationship.friendship.requester_id !== session.user.id;
    const isSelf = profile?.id === session.user.id;
    const profileReels = posts.filter((post) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video')).map((post) => ({ ...post, author: post.author || profile }));

    return <>
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}><Text style={{ color: colors.green, fontWeight: '700' }}>‹  Back</Text></Pressable>
            {loading && !profile ? <Skeleton variant="profile" /> : null}
            {error ? <Text style={{ color: colors.danger, padding: 12 }}>{error}</Text> : null}
            {profile ? <>
                <View style={{ height: 112, justifyContent: 'flex-start', backgroundColor: colors.ink, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 17 }}><Text style={{ color: colors.lime, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>YOUR LITTLE CORNER OF WINDCHIME</Text><Text style={{ color: '#62887a', fontSize: 50, textAlign: 'right', lineHeight: 58 }}>✳</Text></View>
                <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderTopWidth: 0, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar user={profile} token={token} size={76} style={{ borderWidth: 4, borderColor: colors.white, marginTop: -48 }} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800' }}>{profile.name}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>@{profile.username}</Text></View>{isSelf ? <Pressable onPress={() => router.replace('/(main)/profile')} style={buttonStyle}><Text style={buttonText}>Your profile</Text></Pressable> : <Pressable accessibilityLabel="More account options" onPress={() => setMenuOpen(true)} style={[buttonStyle, { width: 42, paddingHorizontal: 0 }]}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} tintColor={colors.ink} size={21} /></Pressable>}</View>
                    {!!profile.bio && <Text style={{ color: colors.ink, lineHeight: 20, marginTop: 15 }}>{profile.bio}</Text>}
                    {!isSelf && relationship?.blocked_by_me ? <Pressable disabled={busy} onPress={toggleBlock} style={[buttonStyle, { marginTop: 15, backgroundColor: '#edf3e8' }]}><Text style={buttonText}>{busy ? 'Please wait…' : 'Unblock account'}</Text></Pressable> : null}
                    {!isSelf && !relationship?.blocked_by_me ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
                        {incoming ? <Pressable disabled={busy} onPress={() => update('accept')} style={[buttonStyle, { flex: 1, backgroundColor: colors.ink }]}><Text style={[buttonText, { color: colors.white }]}>{busy ? 'Please wait…' : 'Accept request'}</Text></Pressable> : <Pressable disabled={busy || friend || requested} onPress={() => update(friend ? 'unfriend' : 'friend')} style={[buttonStyle, { flex: 1, backgroundColor: friend ? '#edf2e9' : colors.ink }]}><Text style={[buttonText, { color: friend ? colors.ink : colors.white }]}>{busy ? 'Please wait…' : friend ? 'Friends' : requested ? 'Request sent' : 'Add friend'}</Text></Pressable>}
                        <Pressable disabled={busy} onPress={() => update(relationship?.following ? 'unfollow' : 'follow')} style={[buttonStyle, { flex: 1 }]}><Text style={buttonText}>{relationship?.following ? 'Unfollow' : 'Follow'}</Text></Pressable>
                        {incoming ? <Pressable disabled={busy} onPress={() => update('reject')} style={[buttonStyle, { flex: 1 }]}><Text style={[buttonText, { color: colors.danger }]}>Decline</Text></Pressable> : null}
                        {friend ? <Pressable disabled={busy} onPress={messageUser} style={[buttonStyle, { flex: 1, backgroundColor: colors.ink }]}><Text style={[buttonText, { color: colors.white }]}>Message</Text></Pressable> : null}
                    </View> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}><Stat count={postTotal} label="Posts" /><Stat count={stats.friends} label="Friends" /><Stat count={stats.followers} label="Followers" /><Stat count={stats.following} label="Following" /></View>
                </View>
                {relationship?.blocked_by_me ? <View style={{ marginTop: 16, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 }}><Text style={{ color: colors.ink, fontWeight: '800' }}>You blocked this account</Text><Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>Unblock them to see their moments and connect again.</Text></View> : <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginTop: 22, marginBottom: 10 }}>{PROFILE_TABS.map(([value, label]) => <Pressable key={value} onPress={() => setProfileTab(value)} style={[buttonStyle, { backgroundColor: profileTab === value ? colors.ink : '#edf3e8' }]}><Text style={[buttonText, profileTab === value && { color: colors.white }]}>{label}</Text></Pressable>)}</ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>{[['grid', 'square.grid.2x2.fill', 'grid_view', 'Grid view'], ['list', 'rectangle.stack.fill', 'view_agenda', 'List view']].map(([value, ios, android, label]) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: layoutMode === value }} onPress={() => setLayoutMode(value)} style={[buttonStyle, { width: 42, minHeight: 38, paddingHorizontal: 0, backgroundColor: layoutMode === value ? '#dce9d3' : colors.white }]}><SymbolView name={{ ios, android, web: android }} tintColor={colors.ink} size={18} /></Pressable>)}</View>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>{isSelf ? 'Your moments' : `${profile.name.split(' ')[0]}’s moments`}</Text>
                <View style={layoutMode === 'grid' ? { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } : null}>{posts.map((post) => <ProfilePostCard key={post.id} post={post} token={token} layout={layoutMode} onOpenReel={setActiveReelId} author={profile} />)}</View>
                {postsHaveMore ? <Pressable disabled={busy} onPress={loadMorePosts} style={[buttonStyle, { marginBottom: 12 }]}>{busy ? <Skeleton variant="inline" /> : <Text style={buttonText}>Load more moments</Text>}</Pressable> : null}
                {!loading && !posts.length ? <Text style={{ color: colors.muted, textAlign: 'center', padding: 24, backgroundColor: colors.white, borderRadius: 16 }}>No shared moments yet.</Text> : null}
                </>}
            </> : null}
        </ScrollView>
    </SafeAreaView>
    <ReelViewer visible={activeReelId !== null} posts={profileReels} initialPostId={activeReelId} token={token} onActiveChange={setActiveReelId} onClose={() => setActiveReelId(null)} />
    <Modal visible={menuOpen} transparent animationType="slide" onRequestClose={() => setMenuOpen(false)}><Pressable onPress={() => setMenuOpen(false)} style={modalBackdrop}><Pressable onPress={(event) => event.stopPropagation()} style={menuSheet}><View style={modalHandle} /><Text style={menuTitle}>Account options</Text>
        <MenuAction label={relationship?.blocked_by_me ? 'Unblock account' : 'Block account'} destructive={!relationship?.blocked_by_me} onPress={toggleBlock} />
        <MenuAction label="Report account" destructive onPress={() => { setMenuOpen(false); setReportOpen(true); }} />
        {friend ? <MenuAction label="Unfriend" destructive onPress={() => removeConnection('unfriend')} /> : null}
        {relationship?.follows_you ? <MenuAction label="Remove follower" destructive onPress={() => removeConnection('remove-follower')} /> : null}
        <Pressable onPress={() => setMenuOpen(false)} style={menuCancel}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></Pressable>
    </Pressable></Pressable></Modal>
    <Modal visible={reportOpen} transparent animationType="slide" onRequestClose={() => setReportOpen(false)}><Pressable onPress={() => setReportOpen(false)} style={modalBackdrop}><Pressable onPress={(event) => event.stopPropagation()} style={menuSheet}><View style={modalHandle} /><Text style={menuTitle}>Report account</Text><Text style={menuDescription}>Choose the reason that best describes the issue.</Text>
        {REPORT_REASONS.map(([value, label]) => <Pressable key={value} onPress={() => setReportReason(value)} style={reasonRow}><View style={[radio, reportReason === value && radioSelected]} /><Text style={{ color: colors.ink, fontWeight: '600' }}>{label}</Text></Pressable>)}
        <Pressable disabled={busy} onPress={submitReport} style={[menuSubmit, busy && { opacity: 0.6 }]}><Text style={{ color: colors.white, fontWeight: '800' }}>{busy ? 'Sending…' : 'Send report'}</Text></Pressable><Pressable onPress={() => setReportOpen(false)} style={menuCancel}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></Pressable>
    </Pressable></Pressable></Modal>
    </>;
}

const buttonStyle = { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 13, backgroundColor: '#edf3e8', borderWidth: 1, borderColor: colors.border };
const buttonText = { color: colors.ink, fontSize: 10, fontWeight: '800' };
const modalBackdrop = { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,28,30,.42)' };
const menuSheet = { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 };
const modalHandle = { width: 40, height: 4, borderRadius: 4, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 };
const menuTitle = { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 10 };
const menuDescription = { color: colors.muted, fontSize: 13, marginBottom: 10 };
const menuCancel = { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 5 };
const menuSubmit = { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.ink, marginTop: 12 };
const reasonRow = { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: colors.border };
const radio = { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted };
const radioSelected = { backgroundColor: colors.green, borderColor: colors.green };
const PROFILE_TABS = [['all', 'All'], ['text', 'Text'], ['photos', 'Photos'], ['videos', 'Videos'], ['reels', 'Reels'], ['reshares', 'Reshares']];
function Stat({ count, label }) { return <View style={{ alignItems: 'center' }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{count}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{label}</Text></View>; }
function MenuAction({ label, destructive, onPress }) { return <Pressable onPress={onPress} style={{ minHeight: 49, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }}><Text style={{ color: destructive ? colors.danger : colors.ink, fontWeight: '700' }}>{label}</Text></Pressable>; }
const REPORT_REASONS = [['spam', 'Spam'], ['harassment', 'Harassment or bullying'], ['hate', 'Hateful content'], ['sexual_content', 'Sexual content'], ['violence', 'Violence or threats'], ['scam', 'Scam or impersonation'], ['privacy', 'Privacy violation'], ['other', 'Something else']];
