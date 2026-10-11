import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ActivityIndicator, Text, View } from 'react-native';
import { SOCIAL_API } from '../../../shared/config/services.js';
import colors from '../../../styles/colors.js';

export default function PostVideo({ postId, mediaId, token, kind }) {
    const player = useVideoPlayer({
        uri: `${SOCIAL_API}/posts/${postId}/media/${mediaId}`,
        headers: { Authorization: `Bearer ${token}` },
    }, (videoPlayer) => {
        videoPlayer.loop = kind === 'reel';
        videoPlayer.muted = true;
    });
    const { status, error } = useEvent(player, 'statusChange', { status: player.status });

    return (
        <View style={{ width: '100%', aspectRatio: 0.82, maxHeight: 520, borderRadius: 18, overflow: 'hidden', backgroundColor: '#102f34', justifyContent: 'center' }}>
            <VideoView
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls
                fullscreenOptions={{ enable: true }}
                allowsPictureInPicture={false}
            />
            {status === 'loading' ? <View pointerEvents="none" style={{ position: 'absolute', alignSelf: 'center' }}><ActivityIndicator color={colors.white} /></View> : null}
            {error ? <View pointerEvents="none" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, padding: 10, borderRadius: 10, backgroundColor: 'rgba(16,47,52,0.88)' }}><Text style={{ color: colors.white, fontSize: 12 }}>This video couldn’t be played. Check your connection and try again.</Text></View> : null}
        </View>
    );
}
