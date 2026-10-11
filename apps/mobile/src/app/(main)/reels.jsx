import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDisplayUser, getFeed, getPostSummary, removePostReaction, setPostReaction } from '../../modules/social/api/feed.js';
import { getPostReactors } from '../../modules/social/api/reactions.js';
import { SOCIAL_API } from '../../shared/config/services.js';
import { getVideosMuted, subscribeVideoMute, toggleVideoMute } from '../../shared/videoAudio.js';
import { useSession } from '../../shared/session/useSession.js';
import ReactionIcon from '../../modules/social/components/ReactionIcon.jsx';
import Avatar from '../../shared/components/Avatar.jsx';
import colors from '../../styles/colors.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';

const viewabilityConfig = { itemVisiblePercentThreshold: 80 };

export default function ReelsScreen() {
    const { session } = useSession();
    const screenFocused = useIsFocused();
    const tabSwipe = useMainTabSwipe('/(main)/reels');
    const [items, setItems] = useState([]);
    const [pageHeight, setPageHeight] = useState(0);
    const [activeId, setActiveId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const cursorRef = useRef(null);
    const hasMoreRef = useRef(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const requestLock = useRef(false);
    const controllerRef = useRef(null);
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        const item = viewableItems.find(({ item: post }) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'))?.item;
        setActiveId(item?.id ?? null);
    }).current;

    const load = useCallback(async (reset = false) => {
        if (requestLock.current || (!reset && !hasMoreRef.current)) return;
        requestLock.current = true;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true); setError('');
        try {
            const page = await getFeed(session.token, reset ? null : cursorRef.current, controller.signal, 'discover');
            const reels = page.data.filter((post) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'));
            const authors = await Promise.all([...new Set(reels.map((post) => post.creator_id))].map(async (id) => [id, await getDisplayUser(session.token, id, controller.signal).catch(() => ({ id, name: 'WindChime member', username: null }))]));
            const mapped = reels.map((post) => ({ ...post, author: new Map(authors).get(post.creator_id) }));
            setItems((current) => reset ? mapped : [...current, ...mapped.filter((post) => !current.some((item) => item.id === post.id))]);
            cursorRef.current = page.pagination.next_cursor;
            hasMoreRef.current = Boolean(page.pagination.has_next_page);
            setHasMore(hasMoreRef.current);
            if (mapped[0]) setActiveId((current) => current || mapped[0].id);
        } catch (cause) { if (!controller.signal.aborted) setError(cause.message || 'Could not load Reels.'); }
        finally { if (!controller.signal.aborted) setLoading(false); requestLock.current = false; }
    }, [session.token]);

    useEffect(() => { load(true); return () => controllerRef.current?.abort(); }, [load]);

    return <SafeAreaView {...tabSwipe} style={{ flex: 1, backgroundColor: '#071214' }} edges={['top', 'bottom']}>
        {items.length ? <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <ReelItem post={item} token={session.token} active={screenFocused && item.id === activeId} pageHeight={pageHeight} />}
            onLayout={(event) => setPageHeight(Math.round(event.nativeEvent.layout.height))}
            pagingEnabled
            snapToInterval={pageHeight || undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onEndReached={() => { if (hasMore) load(); }}
            onEndReachedThreshold={0.8}
            windowSize={3}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            {loading ? <ActivityIndicator color={colors.lime} /> : <>
                <SymbolView name={{ ios: 'play.rectangle', android: 'play_circle', web: 'play_circle' }} tintColor={colors.lime} size={42} />
                <Text style={{ color: 'white', fontSize: 21, fontWeight: '800', marginTop: 15 }}>Reels, at your pace.</Text>
                <Text style={{ color: '#b7c6c0', textAlign: 'center', lineHeight: 21, marginTop: 7 }}>{error || 'Short videos from people and moments you may like will appear here.'}</Text>
                <Pressable onPress={() => load(items.length === 0 && hasMore && cursorRef.current === null)} style={{ marginTop: 18, padding: 12 }}><Text style={{ color: colors.lime, fontWeight: '800' }}>{hasMore && !error ? 'Find more Reels' : 'Try again'}</Text></Pressable>
            </>}
        </View>}
    </SafeAreaView>;
}

function ReelItem({ post, token, active, pageHeight }) {
    const asset = post.media.find((entry) => entry.kind === 'video');
    const muted = useSyncExternalStore(subscribeVideoMute, getVideosMuted, getVideosMuted);
    const source = useMemo(() => ({ uri: `${SOCIAL_API}/posts/${post.id}/media/${asset.id}`, headers: { Authorization: `Bearer ${token}` } }), [asset.id, post.id, token]);
    const player = useVideoPlayer(source, (instance) => { instance.loop = true; instance.muted = muted; });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const [summary, setSummary] = useState(null);
    const [reactionPicker, setReactionPicker] = useState(false);
    const [sheet, setSheet] = useState(null);
    const [reactors, setReactors] = useState([]);
    const [reactorsBusy, setReactorsBusy] = useState(false);
    const lastTap = useRef(0);
    const timer = useRef(null);
    const longPress = useRef(false);
    const lastSummaryId = useRef(post.id);

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
    useEffect(() => () => clearTimeout(timer.current), []);

    async function changeReaction(type) {
        try {
            if (type === 'like' && summary?.reaction?.my_reaction) await removePostReaction(token, post.id);
            else await setPostReaction(token, post.id, type);
            setSummary(await getPostSummary(token, post.id));
        } catch { /* Keep the reel playable if a reaction request is temporarily unavailable. */ }
        setReactionPicker(false);
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
    function tapVideo() {
        const now = Date.now();
        if (now - lastTap.current < 300) { clearTimeout(timer.current); lastTap.current = 0; void changeReaction('like'); return; }
        lastTap.current = now;
        timer.current = setTimeout(() => { try { isPlaying ? player.pause() : player.play(); } catch {} }, 300);
    }

    return <View style={{ height: pageHeight, backgroundColor: '#05090a', justifyContent: 'center' }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />
        <Pressable onPress={tapVideo} style={{ position: 'absolute', inset: 0 }} accessibilityLabel="Tap to pause or play, double tap to like" />
        {status === 'loading' ? <ActivityIndicator pointerEvents="none" color="white" style={{ position: 'absolute', alignSelf: 'center' }} /> : null}
        {error ? <Text style={{ position: 'absolute', alignSelf: 'center', color: 'white' }}>Video unavailable</Text> : null}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 12, left: 16, right: 16, bottom: 12, justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>Reels</Text>
                <Pressable onPress={toggleVideoMute} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute all reels' : 'Mute all reels'} style={control}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor="white" size={20} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                    <Pressable onPress={() => post.author?.username && router.push(`/profiles/${post.author.username}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}><Avatar user={post.author} token={token} size={37} /><View><Text style={{ color: 'white', fontWeight: '800' }}>{post.author?.name || 'WindChime member'}</Text><Text style={{ color: '#d0d8d4', fontSize: 11 }}>@{post.author?.username || 'member'}</Text></View></Pressable>
                    {post.content ? <Text numberOfLines={3} style={{ color: 'white', fontSize: 14, lineHeight: 20 }}>{post.content}</Text> : null}
                </View>
                <View style={{ alignItems: 'center', gap: 22 }}>
                    <View style={{ alignItems: 'center' }}>
                        {reactionPicker ? <View style={{ backgroundColor: 'rgba(12,30,32,.92)', borderRadius: 22, padding: 9, gap: 13, marginBottom: 9 }}>{['like', 'love', 'laugh', 'sad', 'angry'].map((type) => <Pressable key={type} onPress={() => changeReaction(type)}><ReactionIcon type={type} size={26} /></Pressable>)}</View> : null}
                        <Pressable accessibilityLabel="Like reel, hold to choose a reaction" onPress={() => { if (longPress.current) { longPress.current = false; return; } void changeReaction('like'); }} onLongPress={() => { longPress.current = true; setReactionPicker(true); }} delayLongPress={350} style={railButton}><ReactionIcon type={summary?.reaction?.my_reaction?.type || 'like'} size={26} color={summary?.reaction?.my_reaction ? undefined : 'white'} /><Text style={countText}>{summary?.reaction?.total || 0}</Text></Pressable>
                    </View>
                    <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={railButton} accessibilityLabel={`${summary?.comments?.total || 0} comments`}><SymbolView name={{ ios: 'bubble.right', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} tintColor="white" size={24} /><Text style={countText}>{summary?.comments?.total || 0}</Text></Pressable>
                    <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={railButton} accessibilityLabel={`${summary?.repost?.total || 0} reshares`}><SymbolView name={{ ios: 'arrow.2.squarepath', android: 'repeat', web: 'repeat' }} tintColor="white" size={23} /><Text style={countText}>{summary?.repost?.total || 0}</Text></Pressable>
                    <Pressable onPress={() => setSheet('options')} accessibilityLabel="More reel options" style={railButton}><SymbolView name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }} tintColor="white" size={23} /></Pressable>
                </View>
            </View>
        </View>
        <Modal visible={Boolean(sheet)} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
            <Pressable onPress={() => setSheet(null)} style={sheetBackdrop}>
                <Pressable onPress={(event) => event.stopPropagation()} style={sheetCard}>
                    <View style={sheetHandle} />
                    {sheet === 'options' ? <>
                        <Text style={sheetTitle}>Reel options</Text>
                        <Pressable onPress={showReactors} style={sheetRow}><SymbolView name={{ ios: 'heart', android: 'favorite_border', web: 'favorite_border' }} tintColor={colors.green} size={20} /><Text style={sheetText}>See reactions <Text style={sheetHint}>· {summary?.reaction?.total || 0}</Text></Text></Pressable>
                        <Pressable onPress={() => setSheet(null)} style={sheetRow}><SymbolView name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }} tintColor={colors.green} size={20} /><Text style={sheetText}>Share reel</Text></Pressable>
                        <Pressable onPress={() => { setSheet(null); router.push(`/posts/${post.id}`); }} style={sheetRow}><SymbolView name={{ ios: 'text.bubble', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} tintColor={colors.green} size={20} /><Text style={sheetText}>Open conversation</Text></Pressable>
                    </> : <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}><Pressable onPress={() => setSheet('options')}><Text style={sheetHint}>‹ Back</Text></Pressable><Text style={[sheetTitle, { marginBottom: 0 }]}>Reactions · {reactors.length}</Text></View>
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
