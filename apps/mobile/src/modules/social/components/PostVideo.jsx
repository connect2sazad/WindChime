import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, PanResponder, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SOCIAL_API } from '../../../shared/config/services.js';
import colors from '../../../styles/colors.js';
import ReactionIcon from './ReactionIcon.jsx';
import { getVideosMuted, subscribeVideoMute, toggleVideoMute } from '../../../shared/videoAudio.js';

const frame = { width: '100%', aspectRatio: 0.82, maxHeight: 520, borderRadius: 18, overflow: 'hidden', backgroundColor: '#102f34', justifyContent: 'center' };
const REACTIONS = ['like', 'love', 'laugh', 'sad', 'angry'];
const REASONS = [['spam', 'Spam'], ['harassment', 'Harassment'], ['hate', 'Hateful content'], ['sexual_content', 'Sexual content'], ['violence', 'Violence or threats'], ['scam', 'Scam or impersonation'], ['privacy', 'Privacy violation'], ['other', 'Something else']];

export default function PostVideo({ postId, mediaId, token, kind, hasThumbnail = false, isActive = false, fullscreenReelId, onFullscreenReelChange, reaction, reactionCount = 0, commentCount = 0, reshareCount = 0, viewCount = 0, onLike, onReact, onComments, onReshare, onShare, onSeeReactions, onReport, onDoubleTap, onNextReel }) {
    const [localFullscreen, setLocalFullscreen] = useState(false);
    const externallyControlled = fullscreenReelId !== undefined;
    const fullscreen = externallyControlled ? fullscreenReelId === postId : localFullscreen;
    const changeFullscreen = (value) => onFullscreenReelChange ? onFullscreenReelChange(value ? postId : null) : setLocalFullscreen(value);
    const muted = useSyncExternalStore(subscribeVideoMute, getVideosMuted, getVideosMuted);
    const focused = useIsFocused();
    const tapTimer = useRef(null);
    const lastTap = useRef(0);
    const source = useMemo(() => ({ uri: `${SOCIAL_API}/posts/${postId}/media/${mediaId}`, headers: { Authorization: `Bearer ${token}` } }), [postId, mediaId, token]);
    const player = useVideoPlayer(source, (videoPlayer) => { videoPlayer.loop = kind === 'reel'; videoPlayer.muted = false; });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    const [posterFailed, setPosterFailed] = useState(false);
    const showPoster = hasThumbnail && !posterFailed && status !== 'readyToPlay';

    useEffect(() => {
        try {
            player.muted = muted;
            const anotherReelIsFullscreen = fullscreenReelId != null && !fullscreen;
            if (focused && !anotherReelIsFullscreen && (externallyControlled ? (fullscreenReelId == null && kind === 'reel' && isActive) : (fullscreen || (kind === 'reel' && isActive)))) player.play();
            else player.pause();
        } catch { /* FlatList can release a recycled player before its cleanup effect runs. */ }
        return () => { try { player.pause(); } catch { /* The player may already be released. */ } };
    }, [externallyControlled, focused, fullscreen, fullscreenReelId, isActive, kind, muted, player]);
    useEffect(() => () => clearTimeout(tapTimer.current), []);

    function inlineTap() {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            clearTimeout(tapTimer.current); lastTap.current = 0;
            onDoubleTap?.();
            return;
        }
        lastTap.current = now;
        tapTimer.current = setTimeout(() => changeFullscreen(true), 300);
    }

    return <View style={frame}>
        {!fullscreen ? <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={kind !== 'reel'} fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} /> : null}
        {!fullscreen && showPoster ? <Image pointerEvents="none" source={{ uri: `${source.uri}/thumbnail`, headers: source.headers }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={100} onError={() => setPosterFailed(true)} /> : null}
        {kind === 'reel' ? <Pressable accessibilityLabel="Open reel fullscreen; double tap to like" onPress={inlineTap} style={{ position: 'absolute', inset: 0 }} /> : <Pressable accessibilityLabel="Open video fullscreen" onPress={() => changeFullscreen(true)} style={{ position: 'absolute', top: 8, right: 52, width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,47,52,.78)' }}><SymbolView name={{ ios: 'arrow.up.left.and.arrow.down.right', android: 'fullscreen', web: 'fullscreen' }} tintColor={colors.white} size={19} /></Pressable>}
        <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Turn sound on for all videos' : 'Mute all videos'} onPress={toggleVideoMute} style={{ position: 'absolute', top: 8, right: 8, width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(16,47,52,.78)' }}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor={colors.white} size={19} /></Pressable>
        {status === 'loading' && !showPoster ? <ActivityIndicator pointerEvents="none" color={colors.white} style={{ position: 'absolute', alignSelf: 'center' }} /> : null}
        {error ? <Text pointerEvents="none" style={{ color: colors.white, position: 'absolute', bottom: 14, left: 12 }}>Video unavailable. Check your connection.</Text> : null}
        {!externallyControlled ? <Modal visible={fullscreen} animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => changeFullscreen(false)}>
            {fullscreen ? <FullscreenPlayer player={player} kind={kind} muted={muted} hasThumbnail={hasThumbnail} posterSource={{ uri: `${source.uri}/thumbnail`, headers: source.headers }} onPosterError={() => setPosterFailed(true)} posterFailed={posterFailed} onToggleMuted={toggleVideoMute} onClose={() => changeFullscreen(false)} onNextReel={onNextReel} reaction={reaction} reactionCount={reactionCount} commentCount={commentCount} reshareCount={reshareCount} viewCount={viewCount} onLike={onLike} onReact={onReact} onComments={() => { changeFullscreen(false); onComments?.(); }} onReshare={onReshare} onShare={onShare} onSeeReactions={onSeeReactions} onReport={onReport} onDoubleTap={onDoubleTap} /> : null}
        </Modal> : null}
    </View>;
}

function FullscreenPlayer({ player, kind, muted, hasThumbnail, posterSource, posterFailed, onPosterError, onToggleMuted, onClose, onNextReel, reaction, reactionCount, commentCount, reshareCount, viewCount, onLike, onReact, onComments, onReshare, onShare, onSeeReactions, onReport, onDoubleTap }) {
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const [menu, setMenu] = useState(false);
    const [reportMenu, setReportMenu] = useState(false);
    const [reactionMenu, setReactionMenu] = useState(false);
    const [heart, setHeart] = useState(false);
    const tapTimer = useRef(null);
    const lastTap = useRef(0);
    const longPressHandled = useRef(false);
    const swipe = useMemo(() => PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => kind === 'reel' && Math.abs(gesture.dy) > 32 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
        onMoveShouldSetPanResponder: (_, gesture) => kind === 'reel' && Math.abs(gesture.dy) > 28 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15,
        onPanResponderRelease: (_, gesture) => { if (gesture.dy < -70) onNextReel?.(); },
    }), [kind, onNextReel]);
    useEffect(() => () => clearTimeout(tapTimer.current), []);

    function videoTap() {
        const now = Date.now();
        if (now - lastTap.current < 300) {
            clearTimeout(tapTimer.current); lastTap.current = 0;
            onDoubleTap?.(); setHeart(true); setTimeout(() => setHeart(false), 750);
            return;
        }
        lastTap.current = now;
        tapTimer.current = setTimeout(() => isPlaying ? player.pause() : player.play(), 300);
    }
    async function report(reason) {
        setReportMenu(false); setMenu(false);
        try { await onReport?.(reason); }
        catch { /* parent presents the report error */ }
    }

    return <View {...swipe.panHandlers} style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls={false} allowsPictureInPicture={false} />
        {hasThumbnail && !posterFailed && status !== 'readyToPlay' ? <Image pointerEvents="none" source={posterSource} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} contentFit="contain" cachePolicy="memory-disk" priority="high" transition={100} onError={onPosterError} /> : null}
        <Pressable onPress={videoTap} style={{ position: 'absolute', inset: 0 }} accessibilityLabel="Tap to pause or play; double tap to like" />
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'space-between', paddingTop: 48, paddingBottom: 28, paddingHorizontal: 18 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable onPress={onClose} accessibilityLabel="Close fullscreen reel" style={control}><Text style={controlText}>‹</Text></Pressable>
                <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable onPress={onToggleMuted} accessibilityLabel={muted ? 'Turn sound on for all videos' : 'Mute all videos'} style={control}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor={colors.white} size={20} /></Pressable>
                    <Pressable onPress={() => setMenu(true)} accessibilityLabel="More reel options" style={control}><Text style={controlText}>•••</Text></Pressable>
                </View>
            </View>
            <View pointerEvents="box-none" style={{ alignSelf: 'flex-end', alignItems: 'center', gap: 22, marginBottom: 12 }}>
                <View>
                    {reactionMenu ? <View style={{ backgroundColor: 'rgba(12,30,32,.94)', borderRadius: 24, paddingVertical: 9, paddingHorizontal: 8, gap: 12, marginBottom: 9 }}>{REACTIONS.map((type) => <Pressable key={type} onPress={() => { onReact?.(type); setReactionMenu(false); }} accessibilityLabel={`${type} reaction`}><ReactionIcon type={type} size={27} color="#fff" /></Pressable>)}</View> : null}
                    <Pressable onPress={() => { if (longPressHandled.current) { longPressHandled.current = false; return; } onLike?.(); }} onLongPress={() => { longPressHandled.current = true; setReactionMenu(true); }} delayLongPress={350} accessibilityLabel="React to reel; hold for reactions" style={railButton}><ReactionIcon type={reaction || 'like'} size={25} color={reaction ? undefined : '#fff'} /><Text style={railCount}>{reactionCount}</Text></Pressable>
                </View>
                <Pressable onPress={onComments} accessibilityLabel="View comments" style={railButton}><SymbolView name={{ ios: 'bubble.right', android: 'chat_bubble_outline', web: 'chat_bubble_outline' }} tintColor="#fff" size={24} /><Text style={railCount}>{commentCount}</Text></Pressable>
                <Pressable onPress={onReshare} accessibilityLabel="Reshare reel" style={railButton}><SymbolView name={{ ios: 'arrow.2.squarepath', android: 'repeat', web: 'repeat' }} tintColor="#fff" size={24} /><Text style={railCount}>{reshareCount}</Text></Pressable>
                <Pressable onPress={onShare} accessibilityLabel="Send video to a friend" style={railButton}><SymbolView name={{ ios: 'paperplane', android: 'send', web: 'send' }} tintColor="#fff" size={22} /></Pressable>
                <View accessibilityRole="text" accessibilityLabel={`${viewCount} views`} style={railButton}><SymbolView name={{ ios: 'eye', android: 'visibility', web: 'visibility' }} tintColor="#fff" size={22} /><Text style={railCount}>{viewCount}</Text></View>
            </View>
        </View>
        {heart ? <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center' }}><ReactionIcon type="like" size={94} color="#fff" /></View> : null}
        {!isPlaying && status !== 'loading' ? <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center', opacity: 0.85 }}><SymbolView name={{ ios: 'play.fill', android: 'play_arrow', web: 'play_arrow' }} tintColor="#fff" size={54} /></View> : null}
        {status === 'loading' ? <ActivityIndicator color={colors.white} style={{ position: 'absolute', alignSelf: 'center' }} /> : null}
        {error ? <Text style={{ color: colors.white, position: 'absolute', bottom: 48, alignSelf: 'center' }}>Video unavailable. Check your connection.</Text> : null}
        <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
            <Pressable onPress={() => setMenu(false)} style={modalBackdrop}><View style={menuCard}><Text style={menuTitle}>Reel options</Text><Pressable onPress={() => { setMenu(false); onSeeReactions?.(); }} style={menuRow}><Text style={{ color: colors.ink }}>See all reactions · {reactionCount}</Text></Pressable><Pressable onPress={() => { setMenu(false); onShare?.(); }} style={menuRow}><Text style={{ color: colors.ink }}>Share to a friend</Text></Pressable><Pressable onPress={() => { setMenu(false); setReportMenu(true); }} style={menuRow}><Text style={{ color: '#b84c5d', fontWeight: '700' }}>Report reel</Text></Pressable><Pressable onPress={() => setMenu(false)} style={menuRow}><Text style={{ color: colors.ink }}>Cancel</Text></Pressable></View></Pressable>
        </Modal>
        <Modal visible={reportMenu} transparent animationType="fade" onRequestClose={() => setReportMenu(false)}>
            <Pressable onPress={() => setReportMenu(false)} style={modalBackdrop}><View style={menuCard}><Text style={menuTitle}>Why are you reporting this?</Text>{REASONS.map(([reason, label]) => <Pressable key={reason} onPress={() => report(reason)} style={menuRow}><Text style={{ color: colors.ink }}>{label}</Text></Pressable>)}<Pressable onPress={() => setReportMenu(false)} style={menuRow}><Text style={{ color: colors.muted }}>Cancel</Text></Pressable></View></Pressable>
        </Modal>
    </View>;
}

const control = { width: 42, height: 42, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.5)' };
const controlText = { color: '#fff', fontSize: 23, fontWeight: '700' };
const railButton = { alignItems: 'center', minWidth: 42, gap: 4 };
const railCount = { color: '#fff', fontSize: 12, fontWeight: '700', textShadowColor: '#000', textShadowRadius: 5 };
const modalBackdrop = { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.45)', padding: 12 };
const menuCard = { backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 12, maxHeight: '80%' };
const menuTitle = { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 8 };
const menuRow = { minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#e8eee7' };
