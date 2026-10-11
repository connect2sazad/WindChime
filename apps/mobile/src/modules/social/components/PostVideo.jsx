import { useEffect, useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Text, View } from 'react-native';
import { SOCIAL_API } from '../../../shared/config/services.js';
import colors from '../../../styles/colors.js';

export default function PostVideo({ postId, mediaId, token, kind, isActive = false }) {
    const [fullscreen, setFullscreen] = useState(false);
    const player = useVideoPlayer({
        uri: `${SOCIAL_API}/posts/${postId}/media/${mediaId}`,
        headers: { Authorization: `Bearer ${token}` },
    }, (videoPlayer) => {
        videoPlayer.loop = kind === 'reel';
        videoPlayer.muted = true;
    });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    useEffect(() => {
        if (kind === 'reel' && isActive) player.play();
        else player.pause();
        return () => player.pause();
    }, [isActive, kind, player]);

    return (
        <View onTouchEnd={kind === 'reel' ? () => setFullscreen(true) : undefined} style={{ width: '100%', aspectRatio: 0.82, maxHeight: 520, borderRadius: 18, overflow: 'hidden', backgroundColor: '#102f34', justifyContent: 'center' }}>
            <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls
                fullscreenOptions={{ enable: true }}
                allowsPictureInPicture={false}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Open video fullscreen" onPress={() => setFullscreen(true)} style={{ position: 'absolute', top: 8, right: 8, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(16,47,52,0.7)' }}><Text style={{ color: colors.white, fontSize: 20 }}>⛶</Text></Pressable>
            {status === 'loading' ? <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center' }}><ActivityIndicator color={colors.white} /></View> : null}
            {error ? <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, padding: 10, borderRadius: 10, backgroundColor: 'rgba(16,47,52,0.88)' }}><Text style={{ color: colors.white, fontSize: 12 }}>This video couldn’t be played. Check your connection and try again.</Text></View> : null}
            <Modal visible={fullscreen} animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setFullscreen(false)}>
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                    <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} allowsPictureInPicture={false} />
                    <Pressable onPress={() => setFullscreen(false)} accessibilityLabel="Close fullscreen video" style={{ position: 'absolute', top: 48, right: 18, padding: 10 }}><Text style={{ color: '#fff', fontSize: 27 }}>×</Text></Pressable>
                </View>
            </Modal>
        </View>
    );
}
