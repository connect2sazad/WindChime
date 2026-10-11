import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { getMediaUrl } from '../api/feed.js';
import PostVideo from './PostVideo.jsx';
import colors from '../../../styles/colors.js';

export default function MediaCarousel({ post, token, isActive = false, onError, onDoubleTap }) {
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const [width, setWidth] = useState(0);
    const [index, setIndex] = useState(0);
    const touch = useRef(null);
    const lastTap = useRef(0);
    function tapStart(event) { touch.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }
    function tapEnd(event) {
        if (!touch.current || !onDoubleTap) return;
        const distance = Math.abs(event.nativeEvent.pageX - touch.current.x) + Math.abs(event.nativeEvent.pageY - touch.current.y);
        touch.current = null;
        const now = Date.now();
        if (distance < 12 && now - lastTap.current < 320) { lastTap.current = 0; onDoubleTap(); }
        else lastTap.current = distance < 12 ? now : 0;
    }
    if (!media.length) return null;
    return <View onTouchStart={tapStart} onTouchEnd={tapEnd} onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ marginTop: 12, overflow: 'hidden', borderRadius: 14, backgroundColor: '#e9eee6', aspectRatio: 0.95, position: 'relative', width: '100%' }}>
        {media[0].kind === 'video' ? <PostVideo postId={post.id} mediaId={media[0].id} token={token} kind={post.kind} isActive={isActive} /> : width > 0 ? <ScrollView style={{ flex: 1 }} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, event.nativeEvent.layoutMeasurement.width)))}>
            {media.map((asset, itemIndex) => <Image key={asset.id} source={{ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }} style={{ width, height: width / 0.95 }} contentFit="cover" accessibilityLabel={`Post photo ${itemIndex + 1}`} onError={onError} />)}
        </ScrollView> : null}
        {media.length > 1 ? <View style={{ position: 'absolute', top: 9, right: 9, borderRadius: 11, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: 'rgba(23,59,64,.85)' }}><Text style={{ color: colors.white, fontSize: 10, fontWeight: '700' }}>{index + 1} / {media.length}</Text></View> : null}
    </View>;
}
