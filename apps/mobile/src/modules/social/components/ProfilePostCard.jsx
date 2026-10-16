import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useIsFocused, router } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import { getPostSummary, getMediaUrl, recordPostView, removePostReaction, setPostReaction, removeRepost, setRepost } from '../api/feed.js';
import Avatar from '../../../shared/components/Avatar.jsx';
import ReactionIcon from './ReactionIcon.jsx';
import relativeTime from '../../../shared/utils/relativeTime.js';
import colors from '../../../styles/colors.js';

const REACTIONS = ['like', 'love', 'laugh', 'sad', 'angry'];

export default function ProfilePostCard({ post, token, layout = 'list', onOpenReel, author }) {
    const [summary, setSummary] = useState(null);
    const [busy, setBusy] = useState(false);
    const [picker, setPicker] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);
    const focused = useIsFocused();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const longPressHandled = useRef(false);
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const displayAuthor = post.author || author;
    const isGrid = layout === 'grid';

    useEffect(() => {
        if (isGrid) return undefined;
        let alive = true;
        getPostSummary(token, post.id).then((value) => { if (alive) setSummary(value); }).catch(() => {});
        return () => { alive = false; };
    }, [isGrid, post.id, token]);

    useEffect(() => {
        if (!viewerOpen) return undefined;
        let alive = true;
        recordPostView(token, post.id, 'profile').then((views) => {
            if (alive && views) setSummary((current) => ({ ...(current || {}), views }));
        }).catch(() => {});
        return () => { alive = false; };
    }, [post.id, token, viewerOpen]);

    async function react(type = 'like') {
        if (busy) return;
        setBusy(true);
        try {
            if (type === 'like' && summary?.reaction?.my_reaction) await removePostReaction(token, post.id);
            else await setPostReaction(token, post.id, type);
            setSummary(await getPostSummary(token, post.id));
        } finally { setBusy(false); setPicker(false); }
    }

    async function reshare() {
        if (busy) return;
        setBusy(true);
        try {
            if (summary?.repost?.reposted) await removeRepost(token, post.id);
            else await setRepost(token, post.id);
            setSummary(await getPostSummary(token, post.id));
        } finally { setBusy(false); }
    }

    const source = media[photoIndex];
    if (isGrid) return <>
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${post.kind === 'reel' ? 'reel' : 'post media'}`} onPress={() => { if (post.kind === 'reel' && onOpenReel) { onOpenReel(post.id); return; } setPhotoIndex(0); setViewerOpen(true); }} style={{ width: '32%', aspectRatio: 0.88, borderRadius: 13, overflow: 'hidden', backgroundColor: colors.ink, marginBottom: 5 }}>
            {source?.kind === 'image' ? <Image source={{ uri: getMediaUrl(post.id, source.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" /> : source?.kind === 'video' ? <VideoPoster post={post} asset={source} token={token} style={{ width: '100%', height: '100%' }} /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 7, backgroundColor: '#dce9d3' }}><Text style={{ color: colors.ink, fontSize: 25 }}>✳</Text><Text numberOfLines={4} style={{ color: colors.ink, fontSize: 10, marginTop: 5 }}>{post.content || 'Shared a moment'}</Text></View>}
            {post.kind === 'reel' || source?.kind === 'video' ? <View style={{ position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 7, backgroundColor: 'rgba(16,47,52,.8)' }}><Text style={{ color: 'white', fontSize: 9 }}>▶</Text></View> : null}
        </Pressable>
        <ProfilePostViewer visible={viewerOpen} onClose={() => setViewerOpen(false)} post={post} media={media} startIndex={photoIndex} setIndex={setPhotoIndex} token={token} screenWidth={screenWidth} screenHeight={screenHeight} active={focused && viewerOpen} />
    </>;

    return <View style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 17, padding: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 11 }}>
            <Avatar user={displayAuthor} token={token} size={39} />
            <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontSize: 13, fontWeight: '800' }} numberOfLines={1}>{displayAuthor?.name || 'WindChime member'}</Text><Text style={{ color: colors.muted, fontSize: 10, marginTop: 3 }}>{displayAuthor?.username ? `@${displayAuthor.username} · ` : ''}{relativeTime(post.created_at)} ago</Text></View>
            {post.kind === 'reel' ? <SymbolView name={{ ios: 'play.rectangle.fill', android: 'play_circle', web: 'play_circle' }} tintColor={colors.green} size={19} /> : null}
        </View>
        <View>
            {post.content ? <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21 }}>{post.content}</Text> : null}
            {source?.kind === 'image' ? <View style={{ marginTop: 10, position: 'relative' }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Open photo" onPress={() => setViewerOpen(true)}><Image source={{ uri: getMediaUrl(post.id, source.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width: '100%', aspectRatio: 0.95, borderRadius: 13, backgroundColor: '#e9eee6' }} contentFit="cover" cachePolicy="memory-disk" /></Pressable>
                {media.length > 1 ? <View style={{ position: 'absolute', top: 9, right: 9, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: 'rgba(23,59,64,.85)' }}><Text style={{ color: 'white', fontSize: 10, fontWeight: '700' }}>{photoIndex + 1}/{media.length}</Text></View> : null}
            </View> : source ? <Pressable onPress={() => { if (post.kind === 'reel' && onOpenReel) { onOpenReel(post.id); return; } setViewerOpen(true); }} accessibilityRole="button" accessibilityLabel={`Play ${post.kind === 'reel' ? 'reel' : 'video'}`} style={{ marginTop: 10, height: 240, borderRadius: 13, overflow: 'hidden', backgroundColor: '#dce9d3' }}><VideoPoster post={post} asset={source} token={token} style={{ width: '100%', height: '100%' }} /></Pressable> : null}
        </View>
        {media.length > 1 && source?.kind === 'image' ? <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }}>
            <Pressable disabled={!photoIndex} onPress={() => setPhotoIndex((value) => value - 1)} hitSlop={8}><Text style={{ color: photoIndex ? colors.green : colors.muted }}>‹ Previous</Text></Pressable>
            <Pressable disabled={photoIndex >= media.length - 1} onPress={() => setPhotoIndex((value) => value + 1)} hitSlop={8}><Text style={{ color: photoIndex < media.length - 1 ? colors.green : colors.muted }}>Next ›</Text></Pressable>
        </View> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 10, gap: 17 }}>
            <View style={{ position: 'relative' }}>
                <Pressable accessibilityRole="button" accessibilityLabel="Like or remove reaction; hold to choose a reaction" onPress={() => { if (longPressHandled.current) { longPressHandled.current = false; return; } react(); }} onLongPress={() => { longPressHandled.current = true; setPicker(true); }} delayLongPress={350} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                    <ReactionIcon type={summary?.reaction?.my_reaction?.type || 'like'} size={20} color={summary?.reaction?.my_reaction ? undefined : colors.green} /><Text style={{ color: colors.ink, fontSize: 11 }}>{summary?.reaction?.total ?? 'Like'}</Text>
                </Pressable>
                {picker ? <View style={{ position: 'absolute', bottom: 34, left: 0, zIndex: 4, flexDirection: 'row', gap: 8, padding: 10, borderRadius: 16, backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, elevation: 6 }}>{REACTIONS.map((type) => <Pressable key={type} onPress={() => react(type)} hitSlop={5}><ReactionIcon type={type} size={23} /></Pressable>)}</View> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`${summary?.comments?.total || 0} comments`} onPress={() => router.push(`/posts/${post.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}><Text style={{ color: colors.green, fontSize: 19 }}>○</Text><Text style={{ color: colors.ink, fontSize: 11 }}>{summary?.comments?.total ?? 0}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Reshare post" onPress={reshare} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}><Text style={{ color: colors.green, fontSize: 18 }}>⇄</Text><Text style={{ color: colors.ink, fontSize: 11 }}>{summary?.repost?.total ?? 0}</Text></Pressable>
            <View accessibilityRole="text" accessibilityLabel={`${summary?.views?.views ?? post.views_count ?? 0} views`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}><SymbolView name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} tintColor={colors.green} size={18} /><Text style={{ color: colors.ink, fontSize: 11 }}>{summary?.views?.views ?? post.views_count ?? 0}</Text></View>
            {busy ? <ActivityIndicator size="small" color={colors.green} /> : null}
            <Text style={{ marginLeft: 'auto', color: colors.muted, fontSize: 10 }}>{relativeTime(post.created_at)} ago</Text>
        </View>
        <ProfilePostViewer visible={viewerOpen} onClose={() => setViewerOpen(false)} post={post} media={media} startIndex={photoIndex} setIndex={setPhotoIndex} token={token} screenWidth={screenWidth} screenHeight={screenHeight} active={focused && viewerOpen} />
    </View>;
}

function VideoPoster({ post, asset, token, style }) {
    const [posterMissing, setPosterMissing] = useState(false);
    const cachedKey = `windchime-poster-${post.id}-${asset.id}`;
    if (asset.has_thumbnail && !posterMissing) return <Image
        source={{ uri: `${getMediaUrl(post.id, asset.id)}/thumbnail`, headers: { Authorization: `Bearer ${token}` } }}
        style={[{ backgroundColor: '#102f34' }, style]}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
        onError={() => setPosterMissing(true)}
    />;
    return <CachedVideoPoster post={post} asset={asset} token={token} style={style} cacheKey={cachedKey} />;
}

function CachedVideoPoster({ post, asset, token, style, cacheKey }) {
    const [cachedPoster, setCachedPoster] = useState(undefined);
    useEffect(() => {
        let alive = true;
        Image.readFromCacheAsync(cacheKey).then((poster) => { if (alive) setCachedPoster(poster); }).catch(() => { if (alive) setCachedPoster(null); });
        return () => { alive = false; };
    }, [cacheKey]);
    if (cachedPoster === undefined) return <View style={[{ backgroundColor: '#102f34' }, style]} />;
    if (cachedPoster) return <Image source={cachedPoster} style={[{ backgroundColor: '#102f34' }, style]} contentFit="cover" />;
    return <GeneratedVideoPoster post={post} asset={asset} token={token} style={style} cacheKey={cacheKey} />;
}

function GeneratedVideoPoster({ post, asset, token, style, cacheKey }) {
    const source = useMemo(() => ({ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }), [asset.id, post.id, token]);
    const player = useVideoPlayer(source, (instance) => { instance.muted = true; instance.loop = false; });
    const { status } = useEvent(player, 'statusChange', { status: player.status });
    const [thumbnail, setThumbnail] = useState(null);

    useEffect(() => {
        if (status !== 'readyToPlay') return undefined;
        let alive = true;
        Promise.resolve().then(() => player.generateThumbnailsAsync(0.1, { maxWidth: 720, maxHeight: 960 }))
            .then(async ([poster]) => {
                if (!poster) return;
                const image = await Image.loadAsync(poster);
                await Image.writeToCacheAsync(image, cacheKey);
                if (alive) setThumbnail(poster);
            })
            .catch(() => {});
        return () => { alive = false; };
    }, [cacheKey, player, status]);

    return <View style={[{ alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#163b40' }, style]}>
        {thumbnail ? <Image source={thumbnail} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" /> : <>
            {status === 'loading' ? <ActivityIndicator color={colors.white} /> : <SymbolView name={{ ios: 'play.rectangle.fill', android: 'play_circle', web: 'play_circle' }} tintColor="#d9efb7" size={34} />}
            <Text style={{ color: colors.white, fontSize: 11, fontWeight: '700', marginTop: 5 }}>{post.kind === 'reel' ? 'Reel' : 'Video'}</Text>
        </>}
        <View pointerEvents="none" style={{ position: 'absolute', right: 7, bottom: 7, width: 26, height: 26, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,25,27,.68)' }}><SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} tintColor={colors.white} size={15} /></View>
    </View>;
}

function ProfilePostViewer({ visible, onClose, post, media, startIndex, setIndex, token, screenWidth, screenHeight, active }) {
    const source = media[startIndex];
    return <Modal visible={visible} animationType="fade" onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: '#071214', justifyContent: 'center' }}>
            <Pressable onPress={onClose} accessibilityLabel="Close post viewer" style={{ position: 'absolute', top: 48, right: 18, zIndex: 2, width: 42, height: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.14)' }}><Text style={{ color: 'white', fontSize: 25 }}>×</Text></Pressable>
            {media.length > 1 ? <View style={{ position: 'absolute', top: 55, alignSelf: 'center', zIndex: 2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)' }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{startIndex + 1} / {media.length}</Text></View> : null}
            {source?.kind === 'video' ? <ProfileVideoLayer post={post} asset={source} token={token} active={active && visible} width={screenWidth} height={screenHeight} /> : media.length ? <ScrollView horizontal pagingEnabled contentOffset={{ x: startIndex * screenWidth, y: 0 }} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, event.nativeEvent.layoutMeasurement.width)))}>{media.map((asset, index) => <Image key={asset.id} source={{ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width: screenWidth, height: screenHeight }} contentFit="contain" accessibilityLabel={`Photo ${index + 1} of ${media.length}`} />)}</ScrollView> : <Text style={{ color: 'white', padding: 24, fontSize: 18, lineHeight: 27 }}>{post.content || 'A shared moment'}</Text>}
        </View>
    </Modal>;
}

function ProfileVideoLayer({ post, asset, token, active, width, height }) {
    const source = useMemo(() => ({ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }), [asset.id, post.id, token]);
    const player = useVideoPlayer(source, (instance) => { instance.loop = post.kind === 'reel'; instance.muted = false; });
    const { status } = useEvent(player, 'statusChange', { status: player.status });
    const [posterFailed, setPosterFailed] = useState(false);
    useEffect(() => {
        try { if (active) player.play(); else player.pause(); }
        catch { /* The viewer may close while the native player releases. */ }
        return () => { try { player.pause(); } catch { /* Ignore a released player during cleanup. */ } };
    }, [active, player]);
    return <View style={{ width, height, justifyContent: 'center', backgroundColor: '#071214' }}><VideoView player={player} style={{ width, height }} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />{asset.has_thumbnail && !posterFailed && status !== 'readyToPlay' ? <Image pointerEvents="none" source={{ uri: `${source.uri}/thumbnail`, headers: source.headers }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={100} onError={() => setPosterFailed(true)} /> : null}</View>;
}
