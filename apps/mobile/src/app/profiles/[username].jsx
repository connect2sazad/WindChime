import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { IDENTITY_API } from '../../shared/config/services.js';
import { apiRequest } from '../../shared/api/request.js';
import { getRelationship, sendFriendRequest, followUser, unfollowUser, unfriend, getPublicConnections, respondFriendRequest } from '../../modules/social/api/connections.js';
import { getMediaUrl, getUserPosts, getUserReshares } from '../../modules/social/api/feed.js';
import { startConversation } from '../../modules/messages/api/messages.js';
import Avatar from '../../shared/components/Avatar.jsx';
import MediaCarousel from '../../modules/social/components/MediaCarousel.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
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

    return <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ paddingVertical: 8 }}><Text style={{ color: colors.green, fontWeight: '700' }}>‹  Back</Text></Pressable>
            {loading && !profile ? <View style={{ padding: 60 }}><ActivityIndicator color={colors.green} /></View> : null}
            {error ? <Text style={{ color: colors.danger, padding: 12 }}>{error}</Text> : null}
            {profile ? <>
                <View style={{ height: 112, justifyContent: 'flex-start', backgroundColor: colors.ink, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 17 }}><Text style={{ color: colors.lime, fontSize: 9, fontWeight: '800', letterSpacing: 1.2 }}>YOUR LITTLE CORNER OF WINDCHIME</Text><Text style={{ color: '#62887a', fontSize: 50, textAlign: 'right', lineHeight: 58 }}>✳</Text></View>
                <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderTopWidth: 0, borderBottomLeftRadius: 22, borderBottomRightRadius: 22, padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><Avatar user={profile} token={token} size={76} style={{ borderWidth: 4, borderColor: colors.white, marginTop: -48 }} /><View style={{ flex: 1, marginLeft: 12 }}><Text style={{ color: colors.ink, fontSize: 19, fontWeight: '800' }}>{profile.name}</Text><Text style={{ color: colors.muted, marginTop: 3 }}>@{profile.username}</Text></View>{isSelf ? <Pressable onPress={() => router.replace('/(main)/profile')} style={buttonStyle}><Text style={buttonText}>Your profile</Text></Pressable> : null}</View>
                    {!!profile.bio && <Text style={{ color: colors.ink, lineHeight: 20, marginTop: 15 }}>{profile.bio}</Text>}
                    {!isSelf ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
                        {incoming ? <Pressable disabled={busy} onPress={() => update('accept')} style={[buttonStyle, { flex: 1, backgroundColor: colors.ink }]}><Text style={[buttonText, { color: colors.white }]}>{busy ? 'Please wait…' : 'Accept request'}</Text></Pressable> : <Pressable disabled={busy || friend || requested} onPress={() => update(friend ? 'unfriend' : 'friend')} style={[buttonStyle, { flex: 1, backgroundColor: friend ? '#edf2e9' : colors.ink }]}><Text style={[buttonText, { color: friend ? colors.ink : colors.white }]}>{busy ? 'Please wait…' : friend ? 'Friends' : requested ? 'Request sent' : 'Add friend'}</Text></Pressable>}
                        <Pressable disabled={busy} onPress={() => update(relationship?.following ? 'unfollow' : 'follow')} style={[buttonStyle, { flex: 1 }]}><Text style={buttonText}>{relationship?.following ? 'Unfollow' : 'Follow'}</Text></Pressable>
                        {incoming ? <Pressable disabled={busy} onPress={() => update('reject')} style={[buttonStyle, { flex: 1 }]}><Text style={[buttonText, { color: colors.danger }]}>Decline</Text></Pressable> : null}
                        {friend ? <Pressable disabled={busy} onPress={messageUser} style={[buttonStyle, { flex: 1, backgroundColor: colors.ink }]}><Text style={[buttonText, { color: colors.white }]}>Message</Text></Pressable> : null}
                    </View> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 18, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}><Stat count={postTotal} label="Posts" /><Stat count={stats.friends} label="Friends" /><Stat count={stats.followers} label="Followers" /><Stat count={stats.following} label="Following" /></View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7, marginTop: 22, marginBottom: 10 }}>{PROFILE_TABS.map(([value, label]) => <Pressable key={value} onPress={() => setProfileTab(value)} style={[buttonStyle, { backgroundColor: profileTab === value ? colors.ink : '#edf3e8' }]}><Text style={[buttonText, profileTab === value && { color: colors.white }]}>{label}</Text></Pressable>)}</ScrollView>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>{[['list', 'Full posts'], ['grid', 'Tiles']].map(([value, label]) => <Pressable key={value} onPress={() => setLayoutMode(value)} style={[buttonStyle, { backgroundColor: layoutMode === value ? '#dce9d3' : colors.white }]}><Text style={buttonText}>{label}</Text></Pressable>)}</View>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 10 }}>{isSelf ? 'Your moments' : `${profile.name.split(' ')[0]}’s moments`}</Text>
                <View style={layoutMode === 'grid' ? { flexDirection: 'row', flexWrap: 'wrap', gap: 5 } : null}>{posts.map((post) => layoutMode === 'grid' ? <Pressable key={post.id} onPress={() => router.push(`/posts/${post.id}`)} style={{ width: '32%', aspectRatio: 0.9, borderRadius: 10, overflow: 'hidden', backgroundColor: '#e7eee5' }}>{post.media?.[0] ? <Image source={{ uri: getMediaUrl(post.id, post.media[0].id), headers: { Authorization: `Bearer ${token}` } }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <Text numberOfLines={5} style={{ padding: 8, color: colors.ink, fontSize: 10 }}>{post.content || 'Shared a moment'}</Text>}</Pressable> : <View key={post.id} style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, marginBottom: 10 }}>
                    <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21 }}>{post.content}</Text>
                    <MediaCarousel post={post} token={token} onError={() => setError('One or more post media files could not be loaded.')} />
                    <Text style={{ color: colors.muted, fontSize: 10, marginTop: 8 }}>{relativeTime(post.created_at)} ago</Text>
                </View>)}</View>
                {postsHaveMore ? <Pressable disabled={busy} onPress={loadMorePosts} style={[buttonStyle, { marginBottom: 12 }]}><Text style={buttonText}>{busy ? 'Loading…' : 'Load more moments'}</Text></Pressable> : null}
                {!loading && !posts.length ? <Text style={{ color: colors.muted, textAlign: 'center', padding: 24, backgroundColor: colors.white, borderRadius: 16 }}>No shared moments yet.</Text> : null}
            </> : null}
        </ScrollView>
    </SafeAreaView>;
}

const buttonStyle = { minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 13, backgroundColor: '#edf3e8', borderWidth: 1, borderColor: colors.border };
const buttonText = { color: colors.ink, fontSize: 10, fontWeight: '800' };
const PROFILE_TABS = [['all', 'All'], ['text', 'Text'], ['photos', 'Photos'], ['videos', 'Videos'], ['reels', 'Reels'], ['reshares', 'Reshares']];
function Stat({ count, label }) { return <View style={{ alignItems: 'center' }}><Text style={{ color: colors.ink, fontWeight: '800' }}>{count}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{label}</Text></View>; }
