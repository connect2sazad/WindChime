import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { getDisplayUser, getFeed, getPostSummary, removePostReaction, removeRepost, setPostReaction, setRepost } from '../../modules/social/api/feed.js';
import { getPostReactors } from '../../modules/social/api/reactions.js';
import { getConnections } from '../../modules/social/api/connections.js';
import { sendMessage, startConversation } from '../../modules/messages/api/messages.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/feed.styles.js';
import MediaCarousel from '../../modules/social/components/MediaCarousel.jsx';
import ReactionIcon from '../../modules/social/components/ReactionIcon.jsx';
import Avatar from '../../shared/components/Avatar.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
import { sendReport } from '../../modules/safety/api/safety.js';
import useUnreadNotifications from '../../modules/notifications/hooks/useUnreadNotifications.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';

export default function FeedScreen() {
    const tabSwipe = useMainTabSwipe('/(main)');
    const { session } = useSession();
    const unreadNotifications = useUnreadNotifications(session?.token);
    const [mode, setMode] = useState('network');
    const [posts, setPosts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [activeReel, setActiveReel] = useState(null);
    const [fullscreenReelId, setFullscreenReelId] = useState(null);
    const listViewability = useRef(({ viewableItems }) => {
        const reel = viewableItems.find(({ item }) => item.kind === 'reel' && item.media?.some((asset) => asset.kind === 'video'));
        setActiveReel(reel?.item?.id ?? null);
    }).current;
    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;

    const openNextRandomReel = useCallback((currentId) => {
        const candidates = posts.filter((post) => post.id !== currentId && post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'));
        if (!candidates.length) { setFullscreenReelId(null); return; }
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        setFullscreenReelId(next.id);
    }, [posts]);
    const requestLock = useRef(false);
    const requestController = useRef(null);
    const requestId = useRef(0);
    const cursor = useRef(null);
    const canLoadMore = useRef(false);

    const loadPage = useCallback(async ({ reset = false, pull = false } = {}) => {
        if (requestLock.current || (!reset && !canLoadMore.current)) return;
        requestLock.current = true;
        const controller = new AbortController();
        const currentRequest = ++requestId.current;
        requestController.current = controller;
        if (pull) setRefreshing(true);
        else if (reset) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const response = await getFeed(session.token, reset ? null : cursor.current, controller.signal, mode);
            const uniqueCreators = [...new Set(response.data.map((post) => post.creator_id))];
            const userResults = await Promise.all(uniqueCreators.map(async (id) => {
                try { return [id, await getDisplayUser(session.token, id, controller.signal)]; }
                catch { return [id, { id, name: 'WindChime member', username: null }]; }
            }));
            const authors = new Map(userResults);
            const next = response.data.map((post) => ({ ...post, author: authors.get(post.creator_id) }));
            if (currentRequest !== requestId.current) return;
            setPosts((current) => reset ? next : [...current, ...next.filter((post) => !current.some((item) => item.id === post.id))]);
            setPagination(response.pagination);
            cursor.current = response.pagination.next_cursor;
            canLoadMore.current = response.pagination.has_next_page;
        } catch (cause) {
            if (currentRequest === requestId.current) setError(cause.message || 'Could not load the feed.');
        } finally {
            if (requestController.current === controller) {
                requestController.current = null;
                requestLock.current = false;
            }
            if (currentRequest === requestId.current) {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        }
    }, [mode, session.token, session.user]);

    useFocusEffect(useCallback(() => {
        cursor.current = null;
        canLoadMore.current = false;
        const timer = setTimeout(() => loadPage({ reset: true }), 0);
        return () => {
            clearTimeout(timer);
            requestId.current += 1;
            requestController.current?.abort();
            requestController.current = null;
            requestLock.current = false;
        };
    }, [loadPage]));

    const changeMode = (nextMode) => {
        if (nextMode === mode) return;
        requestId.current += 1;
        requestController.current?.abort();
        requestController.current = null;
        requestLock.current = false;
        cursor.current = null;
        canLoadMore.current = false;
        setPagination(null);
        setPosts([]);
        setLoading(true);
        setError('');
        setMode(nextMode);
    };

    const refresh = () => {
        requestId.current += 1;
        requestController.current?.abort();
        requestController.current = null;
        requestLock.current = false;
        cursor.current = null;
        canLoadMore.current = false;
        setPagination(null);
        loadPage({ reset: true, pull: true });
    };

    const footer = loadingMore ? <ActivityIndicator style={styles.listFooter} color={colors.green} /> : pagination?.has_next_page ? <Pressable style={styles.moreButton} onPress={() => loadPage()}><Text style={styles.moreText}>Load more moments</Text></Pressable> : <Text style={styles.endNote}>{posts.length ? 'You’re all caught up for now.' : ''}</Text>;

    return (
        <SafeAreaView {...tabSwipe} style={styles.screen} edges={['top']}>
            <FlatList
                data={posts}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} colors={[colors.green]} />}
                onEndReachedThreshold={0.45}
                onEndReached={() => { if (pagination?.has_next_page) loadPage(); }}
                onViewableItemsChanged={listViewability}
                viewabilityConfig={viewabilityConfig}
                windowSize={7}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                removeClippedSubviews={false}
                ListHeaderComponent={
                    <View>
                        <View style={styles.topline}><View><View style={styles.brandRow}><Text style={styles.brand}>windchime</Text><Text style={styles.brandMark}>✳</Text></View><Text style={styles.greeting}>A little closer, every day</Text></View><Pressable accessibilityRole="button" accessibilityLabel={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : 'Notifications'} onPress={() => router.push('/(main)/notifications')} style={[styles.headerAction, { position: 'relative' }]}><SymbolView name={{ ios: 'bell', android: 'notifications', web: 'notifications' }} tintColor={colors.ink} size={20} />{unreadNotifications ? <View style={{ position: 'absolute', top: -3, right: -4, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.danger }}><Text style={{ color: colors.white, fontSize: 9, fontWeight: '800' }}>{unreadNotifications > 99 ? '99+' : unreadNotifications}</Text></View> : null}</Pressable></View>
                        <Text style={styles.headline}>A little <Text style={styles.headlineAccent}>connection.</Text></Text>
                        <Text style={styles.subhead}>Your latest conversations, in one calm place.</Text>
                        <View style={styles.modeBar}>
                            <ModeButton title="Your people" active={mode === 'network'} onPress={() => changeMode('network')} />
                            <ModeButton title="Discover" active={mode === 'discover'} onPress={() => changeMode('discover')} />
                        </View>
                        <Text style={styles.sectionTitle}>{mode === 'network' ? 'From your corner' : 'A few new voices'}</Text>
                    {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => loadPage({ reset: !posts.length })}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
                        {loading && !posts.length ? <View style={styles.loadingCard}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Finding your latest moments…</Text></View> : null}
                    </View>
                }
                renderItem={({ item }) => <PostCard post={item} token={session.token} isActive={activeReel === item.id} fullscreenReelId={fullscreenReelId} onFullscreenReelChange={setFullscreenReelId} onNextReel={() => openNextRandomReel(item.id)} />}
                ListEmptyComponent={!loading && !error ? <View style={styles.emptyCard}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>It’s quiet here.</Text><Text style={styles.emptyText}>{mode === 'network' ? 'Follow someone or add a friend to bring their moments into your feed.' : 'There are no public moments to discover yet. Try again soon.'}</Text></View> : null}
                ListFooterComponent={footer}
            />
        </SafeAreaView>
    );
}

function ModeButton({ title, active, onPress }) {
    return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}><Text style={[styles.modeText, active && styles.modeTextActive]}>{title}</Text></Pressable>;
}

function PostCard({ post, token, isActive, fullscreenReelId, onFullscreenReelChange, onNextReel }) {
    const [summary, setSummary] = useState(null);
    const [actionError, setActionError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const [reactionPicker, setReactionPicker] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [reactorsVisible, setReactorsVisible] = useState(false);
    const [reactorsLoading, setReactorsLoading] = useState(false);
    const [reactors, setReactors] = useState([]);
    const [shareFriends, setShareFriends] = useState(null);
    const [shareBusy, setShareBusy] = useState(false);
    const longPressed = useRef(false);
    const lastContentTap = useRef(0);
    const likeBurst = useRef(new Animated.Value(0)).current;
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const authorName = post.author?.name || 'WindChime member';
    const time = relativeTime(post.created_at);

    useEffect(() => {
        const controller = new AbortController();
        getPostSummary(token, post.id, controller.signal).then(setSummary).catch(() => {});
        return () => controller.abort();
    }, [post.id, token]);

    async function toggleReaction() {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try {
            if (summary?.reaction?.my_reaction) await removePostReaction(token, post.id);
            else await setPostReaction(token, post.id, 'like');
            setSummary(await getPostSummary(token, post.id));
        } catch (cause) { setActionError(cause.message || 'Could not update your reaction.'); }
        finally { setActionBusy(false); }
    }

    async function likeFromDoubleTap() {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try {
            if (summary?.reaction?.my_reaction?.type !== 'like') {
                await setPostReaction(token, post.id, 'like');
                setSummary(await getPostSummary(token, post.id));
            }
            likeBurst.setValue(0);
            Animated.sequence([
                Animated.timing(likeBurst, { toValue: 1, duration: 180, useNativeDriver: true }),
                Animated.delay(330),
                Animated.timing(likeBurst, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]).start();
        } catch (cause) { setActionError(cause.message || 'Could not like this post.'); }
        finally { setActionBusy(false); }
    }

    async function chooseReaction(type) {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try { await setPostReaction(token, post.id, type); setSummary(await getPostSummary(token, post.id)); }
        catch (cause) { setActionError(cause.message || 'Could not update your reaction.'); }
        finally { setActionBusy(false); setReactionPicker(false); }
    }

    function doubleTapContent() {
        const now = Date.now();
        if (now - lastContentTap.current < 320) likeFromDoubleTap();
        lastContentTap.current = now;
    }

    async function toggleReshare() {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try {
            if (summary?.repost?.reposted) await removeRepost(token, post.id);
            else await setRepost(token, post.id);
            setSummary(await getPostSummary(token, post.id));
        } catch (cause) { setActionError(cause.message || 'Could not reshare this post.'); }
        finally { setActionBusy(false); }
    }

    async function openShare() {
        setShareFriends([]); setShareBusy(true);
        try {
            const result = await getConnections(token, 'friends');
            const users = await Promise.all((result.data || []).slice(0, 30).map((row) => getDisplayUser(token, row.user_id || row.id).catch(() => null)));
            setShareFriends(users.filter(Boolean));
        } catch (cause) { setActionError(cause.message || 'Could not load friends.'); setShareFriends(null); }
        finally { setShareBusy(false); }
    }

    async function sendPostToFriend(user) {
        setShareBusy(true);
        try {
            const conversation = await startConversation(token, user.id);
            await sendMessage(token, conversation.id, '', [], { postId: post.id });
            setShareFriends(null);
            Alert.alert('Sent', `Shared with ${user.name || user.username}.`);
        } catch (cause) { setActionError(cause.message || 'Could not share this post in a message.'); }
        finally { setShareBusy(false); }
    }

    async function showReactors() {
        setOptionsVisible(false);
        setReactorsVisible(true);
        setReactorsLoading(true);
        try {
            const result = await getPostReactors(token, post.id);
            const users = await Promise.all((result.data || []).map(async (row) => {
                const user = await getDisplayUser(token, row.creator_id).catch(() => null);
                return { ...row, user };
            }));
            setReactors(users);
        } catch (cause) { setActionError(cause.message || 'Could not load reactions.'); }
        finally { setReactorsLoading(false); }
    }

    async function reportPost() {
        setOptionsVisible(false);
        try { await sendReport(token, { target_type: 'post', target_id: post.id, reason: 'other' }); Alert.alert('Report sent', 'Thanks for helping keep WindChime safe.'); }
        catch (cause) { setActionError(cause.message || 'Could not send your report.'); }
    }

    return (
        <View style={[styles.postCard, { position: 'relative' }]}>
            <View style={styles.postHeader}>
                <Pressable onPress={() => post.author?.username && router.push(`/profiles/${post.author.username}`)}><Avatar user={post.author} token={token} size={39} style={styles.avatar} /></Pressable>
                <Pressable style={styles.authorBlock} onPress={() => post.author?.username && router.push(`/profiles/${post.author.username}`)}><Text style={styles.authorName} numberOfLines={1}>{authorName}</Text><Text style={styles.authorMeta}>{post.author?.username ? `@${post.author.username}  ·  ` : ''}{time} ago</Text></Pressable>
                <Pressable accessibilityLabel="Moment options" onPress={() => setOptionsVisible(true)} style={{ paddingHorizontal: 8, paddingVertical: 6 }}><Text style={styles.postMark}>•••</Text></Pressable>
            </View>
            <Text style={styles.postLabel}>A SHARED MOMENT</Text>
            {post.content ? <Pressable onPress={doubleTapContent}><Text style={styles.postText}>{post.content}</Text></Pressable> : null}
            {media.length ? <MediaCarousel post={post} token={token} isActive={isActive} fullscreenReelId={fullscreenReelId} onFullscreenReelChange={onFullscreenReelChange} onNextReel={onNextReel} onDoubleTap={likeFromDoubleTap} reaction={summary?.reaction?.my_reaction?.type} reactionCount={summary?.reaction?.total || 0} commentCount={summary?.comments?.total || 0} reshareCount={summary?.repost?.total || 0} onLike={toggleReaction} onReact={chooseReaction} onComments={() => router.push(`/posts/${post.id}`)} onReshare={toggleReshare} onShare={openShare} onSeeReactions={showReactors} onReport={async (reason) => { try { await sendReport(token, { target_type: 'post', target_id: post.id, reason }); Alert.alert('Report sent', 'Thanks for helping keep WindChime safe.'); } catch (cause) { setActionError(cause.message || 'Could not send this report.'); } }} onError={() => setActionError('This photo could not load. Check that the Social service is running and the media belongs to this post.')} /> : null}
            {post.kind === 'reel' ? <View style={styles.kindPill}><Text style={styles.kindText}>REEL</Text></View> : null}
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            <View style={styles.actionRow}>
                <Pressable disabled={actionBusy} onPress={() => { if (longPressed.current) { longPressed.current = false; return; } setReactionPicker(false); toggleReaction(); }} onLongPress={() => { longPressed.current = true; setReactionPicker(true); }} delayLongPress={380} style={styles.socialAction}><ReactionIcon type={summary?.reaction?.my_reaction?.type || 'like'} size={20} color={summary?.reaction?.my_reaction ? undefined : colors.green} /><Text style={[styles.socialActionText, summary?.reaction?.my_reaction && styles.socialActionActive]}>{summary?.reaction?.total ?? 'Like'}</Text></Pressable>
                <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={styles.socialAction}><Text style={styles.socialIcon}>◌</Text><Text style={styles.socialActionText}>{summary?.comments?.total ?? 'Comment'}</Text></Pressable>
                <Pressable disabled={actionBusy} onPress={toggleReshare} style={styles.socialAction}><Text style={styles.socialIcon}>⇄</Text><Text style={[styles.socialActionText, summary?.repost?.reposted && styles.socialActionActive]}>{summary?.repost?.total ?? 0} Share</Text></Pressable>
            </View>
            {reactionPicker ? <View style={styles.reactionPicker}>{['like', 'love', 'laugh', 'sad', 'angry'].map((type) => <Pressable key={type} accessibilityLabel={`${type} reaction`} onPress={() => chooseReaction(type)} style={styles.reactionChoice}><ReactionIcon type={type} size={24} /></Pressable>)}</View> : null}
            <View style={styles.postFooter}><Text style={styles.footerHint}>A moment shared</Text><Text style={styles.postDate}>{time} ago</Text></View>
            <Animated.View pointerEvents="none" style={{ position: 'absolute', top: '36%', left: 0, right: 0, alignItems: 'center', zIndex: 10, opacity: likeBurst, transform: [{ scale: likeBurst.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1.2] }) }] }}>
                <ReactionIcon type="like" size={96} color="#fff" />
            </Animated.View>
            <Modal visible={shareFriends !== null} transparent animationType="slide" onRequestClose={() => setShareFriends(null)}><Pressable onPress={() => setShareFriends(null)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }}><Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '72%', backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 }}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 12 }}>Send to a friend</Text>{shareBusy ? <ActivityIndicator color={colors.green} /> : <ScrollView>{shareFriends?.map((user) => <Pressable key={user.id} disabled={shareBusy} onPress={() => sendPostToFriend(user)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}><Avatar user={user} token={token} size={40} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '700' }}>{user.name}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>@{user.username}</Text></View><Text style={{ color: colors.green, fontWeight: '800' }}>Send</Text></Pressable>)}{!shareFriends?.length ? <Text style={{ color: colors.muted, paddingVertical: 16 }}>Become friends with someone to share moments in chat.</Text> : null}</ScrollView>}<Pressable onPress={() => setShareFriends(null)} style={{ alignItems: 'center', padding: 10 }}><Text style={{ color: colors.muted }}>Cancel</Text></Pressable></Pressable></Pressable></Modal>
            <Modal visible={optionsVisible} transparent animationType="slide" onRequestClose={() => setOptionsVisible(false)}>
                <Pressable onPress={() => setOptionsVisible(false)} style={sheetBackdrop}>
                    <Pressable onPress={(event) => event.stopPropagation()} style={sheetCard}>
                        <View style={sheetHandle} />
                        <Text style={sheetTitle}>Moment options</Text>
                        <Pressable onPress={() => { setOptionsVisible(false); openShare(); }} style={sheetRow}><SymbolView name={{ ios: 'paperplane', android: 'send', web: 'send' }} tintColor={colors.green} size={20} /><Text style={sheetText}>Share in a message</Text></Pressable>
                        <Pressable onPress={showReactors} style={sheetRow}><SymbolView name={{ ios: 'heart', android: 'favorite_border', web: 'favorite_border' }} tintColor={colors.green} size={20} /><Text style={sheetText}>See all reactions <Text style={sheetHint}>· {summary?.reaction?.total || 0}</Text></Text></Pressable>
                        <Pressable onPress={reportPost} style={sheetRow}><SymbolView name={{ ios: 'flag', android: 'outlined_flag', web: 'outlined_flag' }} tintColor={colors.danger} size={20} /><Text style={[sheetText, { color: colors.danger }]}>Report moment</Text></Pressable>
                        <Pressable onPress={() => setOptionsVisible(false)} style={sheetClose}><Text style={sheetCloseText}>Cancel</Text></Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
            <Modal visible={reactorsVisible} transparent animationType="slide" onRequestClose={() => setReactorsVisible(false)}>
                <Pressable onPress={() => setReactorsVisible(false)} style={sheetBackdrop}>
                    <Pressable onPress={(event) => event.stopPropagation()} style={sheetCard}>
                        <View style={sheetHandle} />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><View><Text style={sheetTitle}>Reactions</Text><Text style={sheetHint}>{reactors.length || summary?.reaction?.total || 0} people reacted</Text></View><Pressable onPress={() => setReactorsVisible(false)} style={sheetDismiss}><Text style={{ color: colors.green, fontWeight: '800' }}>Done</Text></Pressable></View>
                        {reactorsLoading ? <ActivityIndicator color={colors.green} style={{ padding: 22 }} /> : <ScrollView style={{ maxHeight: 390 }}>{reactors.length ? reactors.map((row, index) => <View key={`${row.creator_id}-${row.type}-${index}`} style={reactorRow}><ReactionIcon type={row.type} size={23} /><Avatar user={row.user} token={token} size={40} /><View style={{ flex: 1 }}><Text style={sheetText}>{row.user?.name || 'WindChime member'}</Text><Text style={sheetHint}>{row.user?.username ? `@${row.user.username}` : 'WindChime member'}</Text></View></View>) : <Text style={sheetHint}>No reactions yet. Be the first to react.</Text>}</ScrollView>}
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const sheetBackdrop = { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,14,15,.48)' };
const sheetCard = { backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderTopLeftRadius: 24, borderTopRightRadius: 24 };
const sheetHandle = { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#cbd6ca', marginBottom: 16 };
const sheetTitle = { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 4 };
const sheetRow = { minHeight: 55, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 };
const sheetText = { color: colors.ink, fontSize: 14, fontWeight: '700' };
const sheetHint = { color: colors.muted, fontSize: 12 };
const sheetClose = { minHeight: 46, marginTop: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf2e9' };
const sheetCloseText = { color: colors.ink, fontSize: 13, fontWeight: '800' };
const sheetDismiss = { paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#edf2e9', borderRadius: 12 };
const reactorRow = { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border };
