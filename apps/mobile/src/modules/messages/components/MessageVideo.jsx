import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MESSAGES_API } from '../../../shared/config/services.js';

export default function MessageVideo({ conversationId, messageId, mediaIndex, token }) {
    const [fullscreen, setFullscreen] = useState(false);
    const player = useVideoPlayer({
        uri: `${MESSAGES_API}/conversations/${conversationId}/messages/${messageId}/media/${mediaIndex}`,
        headers: { Authorization: `Bearer ${token}` },
    });
    const { error } = useEvent(player, 'statusChange', { status: player.status });
    return <>
        <View style={{ width: 220, height: 220, marginBottom: 5, borderRadius: 12, overflow: 'hidden', backgroundColor: '#102f34' }}>
            <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls allowsPictureInPicture={false} />
            <Pressable accessibilityLabel="Open video fullscreen" onPress={() => setFullscreen(true)} style={{ position: 'absolute', top: 7, right: 7, padding: 7, borderRadius: 9, backgroundColor: 'rgba(0,0,0,.65)' }}><Text style={{ color: '#fff' }}>⛶</Text></Pressable>
            {error ? <Text style={{ color: '#fff', position: 'absolute', bottom: 5, padding: 7, fontSize: 10 }}>Could not load video</Text> : null}
        </View>
        <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
            <View style={{ flex: 1, justifyContent: 'center', backgroundColor: '#000' }}><VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls allowsPictureInPicture={false} /><Pressable onPress={() => setFullscreen(false)} style={{ position: 'absolute', top: 48, right: 18, padding: 10 }}><Text style={{ color: '#fff', fontSize: 28 }}>×</Text></Pressable></View>
        </Modal>
    </>;
}
