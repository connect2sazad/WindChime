import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { SymbolView } from 'expo-symbols';
import { MESSAGES_API } from '../../../shared/config/services.js';
import { getVideosMuted, subscribeVideoMute, toggleVideoMute } from '../../../shared/videoAudio.js';

export default function MessageVideo({ conversationId, messageId, mediaIndex, token }) {
    const [fullscreen, setFullscreen] = useState(false);
    const muted = useSyncExternalStore(subscribeVideoMute, getVideosMuted, getVideosMuted);
    const source = useMemo(() => ({
        uri: `${MESSAGES_API}/conversations/${conversationId}/messages/${messageId}/media/${mediaIndex}`,
        headers: { Authorization: `Bearer ${token}` },
    }), [conversationId, messageId, mediaIndex, token]);
    const player = useVideoPlayer(source, (videoPlayer) => { videoPlayer.muted = false; });
    const { error } = useEvent(player, 'statusChange', { status: player.status });

    useEffect(() => {
        player.muted = muted;
        if (fullscreen) player.pause();
    }, [fullscreen, muted, player]);

    return <>
        {!fullscreen ? <View style={{ width: 220, height: 220, marginBottom: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: '#102f34' }}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} />
            <Pressable accessibilityLabel={muted ? 'Turn sound on for all videos' : 'Mute all videos'} onPress={toggleVideoMute} style={{ position: 'absolute', top: 7, right: 48, padding: 8, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.65)' }}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor="#fff" size={16} /></Pressable>
            <Pressable accessibilityLabel="Open video fullscreen" onPress={() => setFullscreen(true)} style={{ position: 'absolute', top: 7, right: 7, padding: 8, borderRadius: 9, backgroundColor: 'rgba(0,0,0,.65)' }}><Text style={{ color: '#fff' }}>⛶</Text></Pressable>
            {error ? <Text style={{ color: '#fff', position: 'absolute', bottom: 5, padding: 7, fontSize: 10 }}>Could not load video</Text> : null}
        </View> : null}
        <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
            {fullscreen ? <MessageFullscreenPlayer source={source} muted={muted} onToggleMuted={toggleVideoMute} onClose={() => setFullscreen(false)} /> : null}
        </Modal>
    </>;
}

function MessageFullscreenPlayer({ source, muted, onToggleMuted, onClose }) {
    const player = useVideoPlayer(source, (videoPlayer) => { videoPlayer.muted = muted; videoPlayer.play(); });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });
    useEffect(() => { player.muted = muted; }, [muted, player]);
    return <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
        <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls allowsPictureInPicture={false} />
        <Pressable accessibilityLabel={muted ? 'Turn sound on for all videos' : 'Mute all videos'} onPress={onToggleMuted} style={{ position: 'absolute', top: 48, right: 68, padding: 10, borderRadius: 20, backgroundColor: 'rgba(0,0,0,.6)' }}><SymbolView name={{ ios: muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill', android: muted ? 'volume_off' : 'volume_up', web: muted ? 'volume_off' : 'volume_up' }} tintColor="#fff" size={20} /></Pressable>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 48, right: 18, padding: 10 }}><Text style={{ color: '#fff', fontSize: 28 }}>×</Text></Pressable>
        {status === 'loading' ? <ActivityIndicator color="#fff" style={{ position: 'absolute', alignSelf: 'center' }} /> : null}
        {error ? <Text style={{ color: '#fff', position: 'absolute', bottom: 45, alignSelf: 'center' }}>Could not load video</Text> : null}
    </View>;
}
