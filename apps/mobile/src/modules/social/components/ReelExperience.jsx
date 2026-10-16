import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, PanResponder, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import { getDisplayUser, getPostSummary, recordPostInsight, recordPostView, removePostReaction, setPostReaction } from '../api/feed.js';
import { getPostReactors } from '../api/reactions.js';
import { SOCIAL_API } from '../../../shared/config/services.js';
import { getVideosMuted, subscribeVideoMute, toggleVideoMute } from '../../../shared/videoAudio.js';
import { getReelAutoScroll, setReelAutoScroll, subscribeReelAutoScroll } from '../../../shared/reelPreferences.js';
import ReactionIcon from './ReactionIcon.jsx';
import Avatar from '../../../shared/components/Avatar.jsx';
import colors from '../../../styles/colors.js';
import { getConnections } from '../api/connections.js';
import { sendMessage, startConversation } from '../../messages/api/messages.js';

const viewabilityConfig = { itemVisiblePercentThreshold: 80 };

export function ReelViewer({ visible, posts, initialPostId, token, onClose, onActiveChange }) {
    const [pageHeight, setPageHeight] = useState(0);
    const [activeId, setActiveId] = useState(initialPostId);
    const [scrubbing, setScrubbing] = useState(false);
    const listRef = useRef(null);
    const initialIndex = Math.max(0, posts.findIndex((post) => post.id === initialPostId));
    const activeIdRef = useRef(initialPostId);
    const viewability = useRef(({ viewableItems }) => {
        const post = viewableItems.find(({ item }) => item.kind === 'reel' && item.media?.some((asset) => asset.kind === 'video'))?.item;
        if (post && activeIdRef.current !== post.id) {
            activeIdRef.current = post.id;
            setActiveId(post.id);
            onActiveChange?.(post.id);
        }
    }).current;
    useEffect(() => {
        if (!visible || !initialPostId) return;
        activeIdRef.current = initialPostId;
        setActiveId(initialPostId);
        onActiveChange?.(initialPostId);
        if (pageHeight && initialIndex) requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: initialIndex, animated: false }));
    }, [visible, pageHeight, initialIndex, initialPostId, onActiveChange]);
    return <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: '#071214' }} onLayout={(event) => setPageHeight(Math.round(event.nativeEvent.layout.height))}>
            {pageHeight > 0 ? <FlatList
                ref={listRef}
                data={posts}
                keyExtractor={(post) => String(post.id)}
                renderItem={({ item, index }) => <ReelItem post={item} token={token} active={visible && item.id === activeId} pageHeight={pageHeight} viewerMode onClose={onClose} onScrubChange={setScrubbing} onEnded={() => { if (index + 1 < posts.length) listRef.current?.scrollToIndex({ index: index + 1, animated: true }); }} />}
                scrollEnabled={!scrubbing}
                pagingEnabled
                snapToInterval={pageHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                disableIntervalMomentum
                showsVerticalScrollIndicator={false}
                onViewableItemsChanged={viewability}
                viewabilityConfig={viewabilityConfig}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
                windowSize={3}
                initialNumToRender={2}
                maxToRenderPerBatch={2}
                removeClippedSubviews={false}
            /> : null}
        </View>
    </Modal>;
}

export function ReelItem({ post, token, active, pageHeight, onEnded, viewerMode = false, onClose, onScrubChange }) {
    const asset = post.media.find((entry) => entry.kind === 'video');
    const muted = useSyncExternalStore(subscribeVideoMute, getVideosMuted, getVideosMuted);
    const autoScroll = useSyncExternalStore(subscribeReelAutoScroll, getReelAutoScroll, getReelAutoScroll);
    const source = useMemo(() => ({ uri: `${SOCIAL_API}/posts/${post.id}/media/${asset.id}`, headers: { Authorization: `Bearer ${token}` } }), [asset.id, post.id, token]);
    const player = useVideoPlayer(source, (instance) => { instance.loop = !autoScroll; instance.muted = muted; });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    const [posterFailed, setPosterFailed] = useState(false);
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;
    const { currentTime = 0, bufferedPosition = 0 } = useEvent(player, 'timeUpdate', { currentTime: player.currentTime, bufferedPosition: player.bufferedPosition });
    const { duration: loadedDuration = 0 } = useEvent(player, 'sourceLoad', { duration: player.duration });
    const [scrubTime, setScrubTime] = useState(null);
    const [trackWidth, setTrackWidth] = useState(0);
    const scrubStartX = useRef(0);
    const wasPlayingBeforeScrub = useRef(false);
    const duration = Number.isFinite(loadedDuration) && loadedDuration > 0 ? loadedDuration : 0;
    const shownTime = scrubTime ?? currentTime;
    const progress = duration ? Math.max(0, Math.min(1, shownTime / duration)) : 0;
    const bufferedProgress = duration && Number.isFinite(bufferedPosition) ? Math.max(0, Math.min(1, bufferedPosition / duration)) : 0;
    const seekResponder = useMemo(() => PanResponder.create({
        // Claim touches in the scrubber before the full-screen reel pager can treat them as a page swipe.
        onStartShouldSetPanResponderCapture: () => duration > 0,
        onStartShouldSetPanResponder: () => duration > 0,
        onMoveShouldSetPanResponderCapture: () => duration > 0,
        onMoveShouldSetPanResponder: () => duration > 0,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: (event) => {
            wasPlayingBeforeScrub.current = isPlayingRef.current;
            try { player.pause(); } catch { /* A recycled player may already be released. */ }
            onScrubChange?.(true);
            scrubStartX.current = event.nativeEvent.locationX;
            const next = Math.max(0, Math.min(1, scrubStartX.current / Math.max(trackWidth, 1)));
            setScrubTime(next * duration);
        },
        onPanResponderMove: (_, gesture) => {
            const next = Math.max(0, Math.min(1, (scrubStartX.current + gesture.dx) / Math.max(trackWidth, 1)));
            setScrubTime(next * duration);
        },
        onPanResponderRelease: (_, gesture) => {
            const next = Math.max(0, Math.min(1, (scrubStartX.current + gesture.dx) / Math.max(trackWidth, 1)));
            try { player.currentTime = next * duration; } catch { /* A recycled player may already be released. */ }
            if (wasPlayingBeforeScrub.current) { try { player.play(); } catch { /* A recycled player may already be released. */ } }
            onScrubChange?.(false);
            setScrubTime(null);
        },
        onPanResponderTerminate: () => {
            if (wasPlayingBeforeScrub.current) { try { player.play(); } catch { /* A recycled player may already be released. */ } }
            onScrubChange?.(false);
            setScrubTime(null);
        },
    }), [duration, onScrubChange, player, trackWidth]);
    useEffect(() => () => onScrubChange?.(false), [onScrubChange]);
    const [summary, setSummary] = useState(null);
    const [reactionPicker, setReactionPicker] = useState(false);
    const [sheet, setSheet] = useState(null);
    const [reactors, setReactors] = useState([]);
    const [reactorsBusy, setReactorsBusy] = useState(false);
    const [shareUsers, setShareUsers] = useState([]);
    const [shareSearch, setShareSearch] = useState('');
    const [shareBusy, setShareBusy] = useState(false);
    const lastTap = useRef(0);
    const timer = useRef(null);
    const longPress = useRef(false);
    const lastSummaryId = useRef(post.id);
    const likeBurst = useRef(new Animated.Value(0)).current;

    useEffect(() => { try { player.loop = !autoScroll; } catch { /* Ignore a player released during list recycling. */ } }, [autoScroll, player]);
    useEffect(() => { try { player.timeUpdateEventInterval = 0.2; } catch { /* Ignore a player released during list recycling. */ } }, [player]);
    useEffect(() => {
        const subscription = player.addListener('playToEnd', () => { if (active && autoScroll) onEnded?.(); });
        return () => subscription.remove();
    }, [active, autoScroll, onEnded, player]);

    useEffect(() => {
        let alive = true;
        if (lastSummaryId.current !== post.id) { lastSummaryId.current = post.id; setSummary(null); }
        getPostSummary(token, post.id).then((data) => { if (alive) setSummary(data); }).catch(() => {});
        return () => { alive = false; };
    }, [post.id, token]);
    useEffect(() => {
        try {
            player.muted = muted;
            if (active) player.play();
            else player.pause();
        } catch { /* A player may be released while FlatList recycles an offscreen reel. */ }
    }, [active, muted, player]);
    useEffect(() => {
        if (!active) return undefined;
        let alive = true;
        recordPostView(token, post.id, 'reel').then((result) => {
            if (alive && result) setSummary((current) => ({ ...(current || {}), views: result }));
        }).catch(() => {});
        return () => { alive = false; };
    }, [active, post.id, token]);
    useEffect(() => () => clearTimeout(timer.current), []);

    async function changeReaction(type) {
        try {
            if (type === 'like' && summary?.reaction?.my_reaction) await removePostReaction(token, post.id);
            else await setPostReaction(token, post.id, type);
            setSummary(await getPostSummary(token, post.id));
        } catch { /* Keep the reel playable if a reaction request is temporarily unavailable. */ }
        setReactionPicker(false);
    }
    async function likeFromDoubleTap() {
        likeBurst.setValue(0);
        Animated.sequence([
            Animated.timing(likeBurst, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.delay(380),
            Animated.timing(likeBurst, { toValue: 0, duration: 240, useNativeDriver: true }),
        ]).start();
        if (summary?.reaction?.my_reaction?.type !== 'like') {
            try { await setPostReaction(token, post.id, 'like'); setSummary(await getPostSummary(token, post.id)); } catch { /* Keep playback responsive if reactions are temporarily unavailable. */ }
        }
    }
    async function showReactors() {
        setSheet('reactions'); setReactorsBusy(true);
        try {
            const result = await getPostReactors(token, post.id);
            const rows = await Promise.all((result.data || []).map(async (row) => ({ ...row, user: await getDisplayUser(token, row.creator_id).catch(() => null) })));
            setReactors(rows);
        } catch { setReactors([]); }
        finally { setReactorsBusy(false); }
    }
    async function openShare() {
        setSheet('share'); setShareBusy(true); setShareSearch('');
        try {
            const result = await getConnections(token, 'friends');
            const users = await Promise.all((result.data || []).slice(0, 50).map(async (row) => getDisplayUser(token, row.user_id || row.id).catch(() => null)));
            setShareUsers(users.filter(Boolean));
        } catch { setShareUsers([]); }
        finally { setShareBusy(false); }
    }
    async function shareWith(user) {
        setShareBusy(true);
        try {
            const conversation = await startConversation(token, user.id);
            await sendMessage(token, conversation.id, '', [], { postId: post.id });
            recordPostInsight(token, post.id, 'message_share', 'reel').catch(() => {});
            setSheet(null);
            Alert.alert('Sent', `Shared with ${user.name || user.username}.`);
        } catch { Alert.alert('Could not share', 'Please try again when your connection is available.'); }
        finally { setShareBusy(false); }
    }
    function tapVideo() {
        const now = Date.now();
        if (now - lastTap.current < 300) { clearTimeout(timer.current); lastTap.current = 0; void likeFromDoubleTap(); return; }
        lastTap.current = now;
        timer.current = setTimeout(() => { try { isPlaying ? player.pause() : player.play(); } catch {} }, 300);
    }

    return <View style={{ height: pageHeight, backgroundColor: '#05090a', justifyContent: 'center' }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />
        {asset.has_thumbnail && !posterFailed && status !== 'readyToPlay' ? <Image pointerEvents="none" source={{ uri: `${source.uri}/thumbnail`, headers: source.headers }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={100} onError={() => setPosterFailed(true)} /> : null}
        <Pressable onPress={tapVideo} style={{ position: 'absolute', inset: 0 }} accessibilityLabel="Tap to pause or play, double tap to like" />
        {status === 'loading' ? <ActivityIndicator pointerEvents="none" color="white" style={{ position: 'absolute', alignSelf: 'center' }} /> : null}
        {error ? <Text style={{ position: 'absolute', alignSelf: 'center', color: 'white' }}>Video unavailable</Text> : null}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, left: 16, right: 16, bottom: 20, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>{viewerMode ? <Pressable onPress={onClose} accessibilityLabel="Close reel viewer" style={control}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor="white" size={21} /></Pressable> : null}<Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>Reels</Text></View>
                <Pressable onPress={toggleVideoMute} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute all reels' : 'Mute all reels'} style={control}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor="white" size={20} /></Pressable>
            </View>
            <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                        <Pressable onPress={() => { if (!post.author?.username) return; recordPostInsight(token, post.id, 'profile_open', 'reel').catch(() => {}); router.push(`/profiles/${post.author.username}`); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}><Avatar user={post.author} token={token} size={37} /><View><Text style={{ color: 'white', fontWeight: '800' }}>{post.author?.name || 'WindChime member'}</Text><Text style={{ color: '#d0d8d4', fontSize: 11 }}>@{post.author?.username || 'member'}</Text></View></Pressable>
                        {post.content ? <Text numberOfLines={3} style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>{post.content}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'center', gap: 22 }}>
                        <View style={{ alignItems: 'center' }}>
                            {reactionPicker ? <View style={{ backgroundColor: 'rgba(12,30,32,.92)', borderRadius: 22, padding: 9, gap: 13, marginBottom: 9 }}>{['like', 'love', 'laugh', 'sad', 'angry'].map((type) => <Pressable key={type} onPress={() => changeReaction(type)}><ReactionIcon type={type} size={26} /></Pressable>)}</View> : null}
                            <Pressable accessibilityLabel="Like reel, hold to choose a reaction" onPress={() => { if (longPress.current) { longPress.current = false; return; } void changeReaction('like'); }} onLongPress={() => { longPress.current = true; setReactionPicker(true); }} delayLongPress={350} style={railButton}><ReactionIcon type={summary?.reaction?.my_reaction?.type || 'like'} size={26} color={summary?.reaction?.my_reaction ? undefined : 'white'} /><Text style={countText}>{summary?.reaction?.total || 0}</Text></Pressable>
                        </View>
                        <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={railButton} accessibilityLabel={`${summary?.comments?.total || 0} comments`}><SymbolView name={{ ios: 'bubble.right', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} tintColor="white" size={24} /><Text style={countText}>{summary?.comments?.total || 0}</Text></Pressable>
                        <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={railButton} accessibilityLabel={`${summary?.repost?.total || 0} reshares`}><SymbolView name={{ ios: 'arrow.2.squarepath', android: 'repeat', web: 'repeat' }} tintColor="white" size={23} /><Text style={countText}>{summary?.repost?.total || 0}</Text></Pressable>
                        <Pressable onPress={openShare} style={railButton} accessibilityRole="button" accessibilityLabel="Send reel to a friend"><SymbolView name={{ ios: 'paperplane', android: 'send', web: 'send' }} tintColor="white" size={21} /></Pressable>
                        <View accessibilityRole="text" accessibilityLabel={`${summary?.views?.views ?? post.views_count ?? 0} views`} style={railButton}><SymbolView name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} tintColor="white" size={22} /><Text style={countText}>{summary?.views?.views ?? post.views_count ?? 0}</Text></View>
                        <Pressable onPress={() => setSheet('options')} accessibilityLabel="More reel options" style={railButton}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} tintColor="white" size={23} /></Pressable>
                    </View>
                </View>
                {(summary?.reaction?.total || 0) > 0 ? <Pressable onPress={showReactors} accessibilityRole="button" accessibilityLabel={`See all ${summary.reaction.total} reactions`} style={{ minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 9, borderRadius: 16, backgroundColor: 'rgba(0,0,0,.38)' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>{Object.entries(summary.reaction.counts || {}).filter(([, count]) => count > 0).slice(0, 3).map(([type]) => <View key={type} style={{ marginRight: 3 }}><ReactionIcon type={type} size={16} /></View>)}</View>
                    <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{summary.reaction.total} {summary.reaction.total === 1 ? 'reaction' : 'reactions'} · See who reacted</Text>
                </Pressable> : null}
                <View
                    {...seekResponder.panHandlers}
                    onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                    accessibilityRole="adjustable"
                    accessibilityLabel="Reel playback progress"
                    accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(shownTime) }}
                    style={{ height: 24, justifyContent: 'center' }}
                >
                    <View style={{ height: scrubTime == null ? 2 : 4, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.4)', overflow: 'hidden' }}>
                        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${bufferedProgress * 100}%`, backgroundColor: 'rgba(255,255,255,.48)' }} />
                        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, backgroundColor: '#fff' }} />
                    </View>
                    {scrubTime != null ? <Text pointerEvents="none" style={{ position: 'absolute', bottom: 22, left: Math.max(0, Math.min(trackWidth - 50, progress * trackWidth - 25)), color: '#fff', fontSize: 11, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 4 }}>{formatPlaybackTime(scrubTime)}</Text> : null}
                </View>
            </View>
        </View>
        <Animated.View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', opacity: likeBurst, transform: [{ scale: likeBurst.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.18] }) }] }}><ReactionIcon type="like" size={96} color="#fff" /></Animated.View>
        <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
            <Pressable onPress={() => setSheet(null)} style={sheetBackdrop}>
                <Pressable onPress={(event) => event.stopPropagation()} style={sheetCard}>
                    <View style={sheetHandle} />
                    {sheet === 'options' ? <>
                        <Text style={sheetTitle}>Reel options</Text>
                        <Pressable onPress={() => setReelAutoScroll(!autoScroll)} style={sheetRow}><SymbolView name={{ ios: 'arrow.down.to.line', android: 'south', web: 'south' }} tintColor={colors.green} size={20} /><Text style={[sheetText, { flex: 1 }]}>Auto-scroll to next reel</Text><Text style={{ color: autoScroll ? colors.green : colors.muted, fontWeight: '800' }}>{autoScroll ? 'On' : 'Off'}</Text></Pressable>
                        <Pressable onPress={showReactors} style={sheetRow}><SymbolView name={{ ios: 'heart', android: 'favorite_border', web: 'favorite_border' }} tintColor={colors.green} size={20} /><Text style={sheetText}>See reactions <Text style={sheetHint}>· {summary?.reaction?.total || 0}</Text></Text></Pressable>
                        <Pressable onPress={openShare} style={sheetRow}><SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} tintColor={colors.green} size={20} /><Text style={sheetText}>Share reel</Text></Pressable>
                        <Pressable onPress={() => { setSheet(null); router.push(`/posts/${post.id}`); }} style={sheetRow}><SymbolView name={{ ios: 'text.bubble', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} tintColor={colors.green} size={20} /><Text style={sheetText}>Open conversation</Text></Pressable>
                    </> : sheet === 'share' ? <>
                        <Text style={sheetTitle}>Send this reel</Text>
                        <TextInput value={shareSearch} onChangeText={setShareSearch} placeholder="Find a friend" placeholderTextColor={colors.muted} style={{ height: 44, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 13, color: colors.ink, marginVertical: 12 }} />
                        {shareBusy ? <ActivityIndicator color={colors.green} style={{ padding: 16 }} /> : <ScrollView style={{ maxHeight: 340 }}>{shareUsers.filter((user) => `${user.name || ''} ${user.username || ''}`.toLowerCase().includes(shareSearch.toLowerCase())).map((user) => <Pressable key={user.id} disabled={shareBusy} onPress={() => shareWith(user)} style={reactorRow}><Avatar user={user} token={token} size={40} /><View style={{ flex: 1 }}><Text style={sheetText}>{user.name || 'WindChime member'}</Text><Text style={sheetHint}>{user.username ? `@${user.username}` : ''}</Text></View><SymbolView name={{ ios: 'paperplane', android: 'send', web: 'send' }} tintColor={colors.green} size={18} /></Pressable>)}{!shareUsers.length ? <Text style={[sheetHint, { paddingVertical: 18 }]}>Add a friend to send this reel in a message.</Text> : null}</ScrollView>}
                    </> : <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}><Pressable onPress={() => setSheet('options')}><Text style={sheetHint}>‹ Back</Text></Pressable><Text style={[sheetTitle, { marginBottom: 0 }]}>Reactions · {summary?.reaction?.total ?? reactors.length}</Text></View>
                        {reactorsBusy ? <ActivityIndicator color={colors.green} style={{ padding: 22 }} /> : <ScrollView style={{ maxHeight: 360 }}>{reactors.length ? reactors.map((row, index) => <View key={`${row.creator_id}-${row.type}-${index}`} style={reactorRow}><ReactionIcon type={row.type} size={22} /><Avatar user={row.user} token={token} size={38} /><View style={{ flex: 1 }}><Text style={sheetText}>{row.user?.name || 'WindChime member'}</Text><Text style={sheetHint}>{row.user?.username ? `@${row.user.username}` : 'WindChime member'}</Text></View></View>) : <Text style={sheetHint}>No reactions yet.</Text>}</ScrollView>}
                    </>}
                    <Pressable onPress={() => setSheet(null)} style={sheetClose}><Text style={sheetCloseText}>Done</Text></Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    </View>;
}


const control = { width: 42, height: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.5)' };
const railButton = { alignItems: 'center', minWidth: 42, gap: 4 };
const countText = { color: 'white', fontSize: 11, fontWeight: '800', textShadowColor: '#000', textShadowRadius: 5 };
const sheetBackdrop = { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(3,14,15,.5)' };
const sheetCard = { backgroundColor: colors.white, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 26, borderTopLeftRadius: 24, borderTopRightRadius: 24 };
const sheetHandle = { alignSelf: 'center', width: 38, height: 4, borderRadius: 3, backgroundColor: '#cbd6ca', marginBottom: 16 };
const sheetTitle = { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 8 };
const sheetRow = { minHeight: 54, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 13 };
const sheetText = { color: colors.ink, fontSize: 14, fontWeight: '700' };
const sheetHint = { color: colors.muted, fontSize: 12 };
const reactorRow = { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border };
const sheetClose = { minHeight: 46, marginTop: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8f0e2' };
const sheetCloseText = { color: colors.ink, fontSize: 13, fontWeight: '800' };

function formatPlaybackTime(value) {
    const seconds = Math.max(0, Math.floor(value || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
