import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';
import { Image as ExpoImage } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createMediaPost, createPost } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';
import styles from '../../styles/create.styles.js';
import Avatar from '../../shared/components/Avatar.jsx';

export default function CreateScreen() {
    const tabSwipe = useMainTabSwipe('/(main)/create');
    const { session } = useSession();
    const [content, setContent] = useState('');
    const [assets, setAssets] = useState([]);
    const [kind, setKind] = useState('post');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [posterFailed, setPosterFailed] = useState(false);
    const selectedVideoAssetUri = kind === 'reel' ? assets[0]?.uri : null;
    const selectedVideoUri = kind === 'reel' ? assets[0]?.playerUri || assets[0]?.uri : null;
    const onPosterReady = useCallback((thumbnailUri) => {
        setAssets((current) => current.map((asset) => asset.uri === selectedVideoAssetUri ? { ...asset, thumbnailUri } : asset));
    }, [selectedVideoAssetUri]);
    const onPosterFailed = useCallback((cause) => {
        setPosterFailed(true);
        setError(cause?.message ? `Could not prepare the video preview: ${cause.message}` : 'Could not prepare the video preview. Choose the video again or try another clip.');
    }, []);

    async function publish() {
        const text = content.trim();
        if (kind === 'reel' && !assets.length) { setError('Choose a video before sharing a Reel.'); return; }
        if ((!text && !assets.length) || busy) return;
        setBusy(true); setError('');
        try {
            if (assets.length) {
                await createMediaPost(session.token, text, assets, kind);
                if (kind === 'reel') {
                    try {
                        const stagedFile = new File(assets[0].uri);
                        if (stagedFile.exists) stagedFile.delete();
                    } catch { /* The operating system can clear cache files independently. */ }
                }
            }
            else await createPost(session.token, text);
            setContent('');
            setAssets([]);
            router.replace('/(main)');
        } catch (cause) { setError(cause.message || 'Your post could not be shared.'); }
        finally { setBusy(false); }
    }

    const canPublish = kind === 'reel' ? Boolean(assets[0]?.thumbnailUri) : Boolean(content.trim() || assets.length);

    async function pickPhotos() {
        setError('');
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 12,
            quality: 0.9,
        });
        if (result.canceled) return;
        const selected = (result.assets || []).slice(0, 12);
        if (selected.some((asset) => asset.mimeType && !['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType))) {
            setError('Choose JPG, PNG, or WebP photos. HEIC and other formats are not accepted yet.');
            return;
        }
        if (selected.some((asset) => asset.width > asset.height)) {
            setError('WindChime photos must be square or portrait. Choose or crop portrait images.');
            return;
        }
        if (selected.some((asset) => asset.fileSize > 10 * 1024 * 1024)) {
            setError('Each photo must be 10 MB or smaller.');
            return;
        }
        setAssets(selected);
        setPosterFailed(false);
        setKind('post');
    }

    async function pickVideo() {
        setError('');
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
        if (result.canceled || !result.assets?.[0]) return;
        const asset = result.assets[0];
        if (asset.mimeType && !['video/mp4', 'video/webm'].includes(asset.mimeType)) {
            setError('Choose an MP4 or WebM video. MOV videos are not supported yet.');
            return;
        }
        if (asset.fileSize > 50 * 1024 * 1024) {
            setError('Videos must be 50 MB or smaller.');
            return;
        }
        try {
            // Android's picker URI is temporary and can disappear before Expo Video reads it.
            // Copy it into app cache while the picker permission is still available.
            const extension = (asset.fileName?.split('.').pop()?.toLowerCase() || asset.mimeType?.split('/').pop() || 'mp4').replace(/[^a-z0-9]/g, '') || 'mp4';
            const fileName = `windchime-reel-${Date.now()}.${extension}`;
            const source = new File(asset.uri);
            if (!source.exists) throw new Error('Android could not access the selected video. Select it again from your Gallery.');
            const stagedFile = new File(Paths.cache, fileName);
            await source.copy(stagedFile);
            if (!stagedFile.exists || stagedFile.size === 0) throw new Error('The selected video could not be copied to app storage. Select it again.');
            // Expo Go encodes its virtual "$anonymous/<slug>" directory as "%24anonymous%2F".
            // expo-video treats that encoded slash literally on Android, so give the player a
            // decoded file URI while keeping FileSystem's original URI for multipart upload.
            const playerUri = Platform.OS === 'android' ? decodeURIComponent(stagedFile.uri) : stagedFile.uri;
            setAssets([{ ...asset, uri: stagedFile.uri, playerUri, fileName, fileSize: stagedFile.size, type: 'video' }]);
            setPosterFailed(false);
            setKind('reel');
        } catch (cause) {
            setError(cause.message || 'Could not prepare this video. Choose it again from your Gallery.');
        }
    }

    return (
        <SafeAreaView {...tabSwipe} style={styles.screen} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
                    <View style={styles.top}><Text style={styles.brand}>windchime ✳</Text><Text style={styles.step}>A MOMENT TO SHARE</Text></View>
                    <Text style={styles.title}>What’s on your mind?</Text>
                    <Text style={styles.subtitle}>A thought, a question, or a small hello. Start a conversation with your people.</Text>
                    <View style={styles.card}>
                        <View style={styles.author}><Avatar user={session.user} token={session.token} size={36} style={styles.avatar} /><Text style={styles.authorName}>{session.user.name || 'Your profile'}</Text></View>
                        <View style={styles.mediaActions}>{['post', 'reel'].map((mode) => <Pressable key={mode} accessibilityRole="button" accessibilityState={{ selected: kind === mode }} style={[styles.mediaButton, kind === mode && { backgroundColor: colors.ink }]} onPress={() => { setKind(mode); setAssets([]); setError(''); }}><Text style={[styles.mediaButtonText, kind === mode && { color: colors.white }]}>{mode === 'post' ? 'Post' : 'Reel / video'}</Text></Pressable>)}</View>
                        <TextInput
                            style={styles.composer}
                            value={content}
                            onChangeText={setContent}
                            placeholder="Write something worth sharing…"
                            placeholderTextColor={colors.muted}
                            multiline
                            maxLength={2000}
                            autoFocus
                            textAlignVertical="top"
                        />
                        <View style={styles.mediaActions}>{kind === 'post' ? <Pressable accessibilityRole="button" style={styles.mediaButton} onPress={pickPhotos}><Text style={styles.mediaButtonText}>▧  Add photos</Text></Pressable> : <Pressable accessibilityRole="button" style={styles.mediaButton} onPress={pickVideo}><Text style={styles.mediaButtonText}>▶  Choose a reel video</Text></Pressable>}</View>
                        {assets.length ? <View style={styles.previewRow}>
                            {assets.map((asset, index) => <View key={`${asset.uri}-${index}`} style={styles.preview}>
                                {kind === 'reel' ? <View style={styles.videoPreview}>{asset.thumbnailUri ? <Image source={{ uri: asset.thumbnailUri }} style={{ width: '100%', height: '100%', position: 'absolute', borderRadius: 12 }} resizeMode="cover" /> : null}<Text style={styles.videoGlyph}>▶</Text><Text style={styles.videoName} numberOfLines={1}>{asset.thumbnailUri ? 'Preview ready' : asset.fileName || 'Preparing preview…'}</Text></View> : <Image source={{ uri: asset.uri }} style={styles.previewImage} />}
                                <Pressable accessibilityRole="button" accessibilityLabel="Remove selected media" onPress={() => { setAssets((current) => current.filter((_, i) => i !== index)); if (assets.length === 1) setKind('post'); }} style={styles.removePreview}><Text style={styles.removePreviewText}>×</Text></Pressable>
                            </View>)}
                        </View> : null}
                        <Text style={styles.count}>{content.length} / 2,000</Text>
                        <Text style={styles.hint}>{assets.length ? kind === 'reel' ? assets[0]?.thumbnailUri ? 'Your Reel preview is ready.' : posterFailed ? 'Could not prepare a preview. Choose this video again or try another clip.' : 'Preparing a preview image for your Reel…' : `${assets.length} ${assets.length === 1 ? 'photo' : 'photos'} selected.` : 'Add up to 12 square or portrait photos, or share one video as a Reel.'}</Text>
                    </View>
                    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                    <Pressable accessibilityRole="button" disabled={!canPublish || busy} onPress={publish} style={[styles.button, (!canPublish || busy) && styles.disabled]}>
                        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Share your moment  →</Text>}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
            {selectedVideoUri && !assets[0]?.thumbnailUri && !posterFailed ? <VideoPosterExtractor key={selectedVideoUri} uri={selectedVideoUri} onReady={onPosterReady} onFailed={onPosterFailed} /> : null}
        </SafeAreaView>
    );
}

function VideoPosterExtractor({ uri, onReady, onFailed }) {
    const player = useVideoPlayer(uri, (instance) => { instance.muted = true; });
    const { status } = useEvent(player, 'statusChange', { status: player.status });
    useEffect(() => {
        if (status !== 'readyToPlay') return undefined;
        let active = true;
        Promise.resolve().then(() => player.generateThumbnailsAsync(0.1, { maxWidth: 720, maxHeight: 960 })).then(async ([poster]) => {
            if (!active) return;
            if (!poster) { onFailed(new Error('Expo did not return a frame from this video.')); return; }
            const cacheKey = `windchime-poster-${uri}`;
            // VideoThumbnail is a shared native image ref; materialize it as an expo-image
            // ImageRef before writing it to disk so the local file can be uploaded.
            const image = await ExpoImage.loadAsync(poster);
            await ExpoImage.writeToCacheAsync(image, cacheKey);
            const uriOnDisk = await ExpoImage.getCachePathAsync(cacheKey);
            if (active && uriOnDisk) onReady(uriOnDisk.startsWith('file://') ? uriOnDisk : `file://${uriOnDisk}`);
            else if (active) onFailed(new Error('Expo could not save the generated frame to the device cache.'));
        }).catch((cause) => { if (active) onFailed(cause); });
        return () => { active = false; };
    }, [onFailed, onReady, player, status, uri]);
    return null;
}
