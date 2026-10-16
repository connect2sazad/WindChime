import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { getMediaUrl } from '../api/feed.js';
import PostVideo from './PostVideo.jsx';
import colors from '../../../styles/colors.js';

export default function MediaCarousel({ post, token, isActive = false, onError, onDoubleTap, reaction, reactionCount, commentCount, reshareCount, viewCount = 0, onLike, onReact, onComments, onReshare, onShare, onSeeReactions, onReport, fullscreenReelId, onFullscreenReelChange, onNextReel }) {
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const [width, setWidth] = useState(0);
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const [viewerOpen, setViewerOpen] = useState(false);
    const touch = useRef(null);
    const lastTap = useRef(0);
    const singleTapTimer = useRef(null);
    useEffect(() => () => clearTimeout(singleTapTimer.current), []);
    function tapStart(event) { touch.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }
    function tapEnd(event) {
        if (!touch.current || media[0]?.kind === 'video') return;
        const distance = Math.abs(event.nativeEvent.pageX - touch.current.x) + Math.abs(event.nativeEvent.pageY - touch.current.y);
        touch.current = null;
        const now = Date.now();
        if (distance < 12 && now - lastTap.current < 320) {
            clearTimeout(singleTapTimer.current); lastTap.current = 0;
            if (onDoubleTap) onDoubleTap();
            else setViewerOpen(true);
        }
        else if (distance < 12) { lastTap.current = now; singleTapTimer.current = setTimeout(() => setViewerOpen(true), 300); }
        else lastTap.current = 0;
    }
    if (!media.length) return null;
    return <View onTouchStart={tapStart} onTouchEnd={tapEnd} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ marginTop: 12, overflow: 'hidden', borderRadius: 14, backgroundColor: '#e9eee6', aspectRatio: 0.95, position: 'relative', width: '100%' }}>
        {media[0].kind === 'video' ? <PostVideo postId={post.id} mediaId={media[0].id} token={token} kind={post.kind} hasThumbnail={media[0].has_thumbnail} isActive={isActive} fullscreenReelId={fullscreenReelId} onFullscreenReelChange={onFullscreenReelChange} onNextReel={onNextReel} reaction={reaction} reactionCount={reactionCount} commentCount={commentCount} reshareCount={reshareCount} viewCount={viewCount} onLike={onLike} onReact={onReact} onComments={onComments} onReshare={onReshare} onShare={onShare} onSeeReactions={onSeeReactions} onReport={onReport} onDoubleTap={onDoubleTap} /> : width > 0 ? <ScrollView style={{ flex: 1 }} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, event.nativeEvent.layoutMeasurement.width)))}>
            {media.map((asset, itemIndex) => <Image key={asset.id} source={{ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width, height: width / 0.95 }} contentFit="cover" accessibilityLabel={`Post photo ${itemIndex + 1}`} onError={onError} />)}
        </ScrollView> : null}
        {media.length > 1 ? <View style={{ position: 'absolute', top: 9, right: 9, borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(23,59,64,.85)' }}><Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>{index + 1} / {media.length}</Text></View> : null}
        <Modal visible={viewerOpen} animationType="fade" onRequestClose={() => setViewerOpen(false)}>
            <View style={{ flex: 1, backgroundColor: '#071214', justifyContent: 'center' }}>
                <Pressable onPress={() => setViewerOpen(false)} accessibilityLabel="Close photo viewer" style={{ position: 'absolute', top: 48, right: 18, zIndex: 2, width: 42, height: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.14)' }}><Text style={{ color: 'white', fontSize: 25 }}>×</Text></Pressable>
                {media.length > 1 ? <View style={{ position: 'absolute', top: 55, alignSelf: 'center', zIndex: 2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.14)' }}><Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{index + 1} / {media.length}</Text></View> : null}
                <ScrollView horizontal pagingEnabled contentOffset={{ x: index * screenWidth, y: 0 }} showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, event.nativeEvent.layoutMeasurement.width)))}>
                    {media.map((asset, itemIndex) => <Image key={asset.id} source={{ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width: screenWidth, height: screenHeight }} contentFit="contain" accessibilityLabel={`Photo ${itemIndex + 1} of ${media.length}`} onError={onError} />)}
                </ScrollView>
            </View>
        </Modal>
    </View>;
}
