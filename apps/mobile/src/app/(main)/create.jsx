import { useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createMediaPost, createPost } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/create.styles.js';

export default function CreateScreen() {
    const { session } = useSession();
    const [content, setContent] = useState('');
    const [assets, setAssets] = useState([]);
    const [kind, setKind] = useState('post');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    async function publish() {
        const text = content.trim();
        if ((!text && !assets.length) || busy) return;
        setBusy(true); setError('');
        try {
            if (assets.length) await createMediaPost(session.token, text, assets, kind);
            else await createPost(session.token, text);
            setContent('');
            setAssets([]);
            router.replace('/(main)');
        } catch (cause) { setError(cause.message || 'Your post could not be shared.'); }
        finally { setBusy(false); }
    }

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
        setAssets([asset]);
        setKind('reel');
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.top}><Text style={styles.brand}>windchime ✳</Text><Text style={styles.step}>A MOMENT TO SHARE</Text></View>
                    <Text style={styles.title}>What’s on your mind?</Text>
                    <Text style={styles.subtitle}>A thought, a question, or a small hello. Start a conversation with your people.</Text>
                    <View style={styles.card}>
                        <View style={styles.author}><View style={styles.avatar}><Text style={styles.avatarText}>{(session.user.name || 'W').trim().slice(0, 1).toUpperCase()}</Text></View><Text style={styles.authorName}>{session.user.name || 'Your profile'}</Text></View>
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
                        <View style={styles.mediaActions}>
                            <Pressable accessibilityRole="button" style={styles.mediaButton} onPress={pickPhotos}><Text style={styles.mediaButtonText}>▧  Add photos</Text></Pressable>
                            <Pressable accessibilityRole="button" style={styles.mediaButton} onPress={pickVideo}><Text style={styles.mediaButtonText}>▶  Add a video</Text></Pressable>
                        </View>
                        {assets.length ? <View style={styles.previewRow}>
                            {assets.map((asset, index) => <View key={`${asset.uri}-${index}`} style={styles.preview}>
                                {kind === 'reel' ? <View style={styles.videoPreview}><Text style={styles.videoGlyph}>▶</Text><Text style={styles.videoName} numberOfLines={1}>{asset.fileName || 'Video selected'}</Text></View> : <Image source={{ uri: asset.uri }} style={styles.previewImage} />}
                                <Pressable accessibilityRole="button" accessibilityLabel="Remove selected media" onPress={() => { setAssets((current) => current.filter((_, i) => i !== index)); if (assets.length === 1) setKind('post'); }} style={styles.removePreview}><Text style={styles.removePreviewText}>×</Text></Pressable>
                            </View>)}
                        </View> : null}
                        <Text style={styles.count}>{content.length} / 2,000</Text>
                        <Text style={styles.hint}>{assets.length ? kind === 'reel' ? 'This video will be shared as a Reel.' : `${assets.length} ${assets.length === 1 ? 'photo' : 'photos'} selected.` : 'Add up to 12 square or portrait photos, or share one video as a Reel.'}</Text>
                    </View>
                    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                    <Pressable accessibilityRole="button" disabled={(!content.trim() && !assets.length) || busy} onPress={publish} style={[styles.button, ((!content.trim() && !assets.length) || busy) && styles.disabled]}>
                        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Share your moment  →</Text>}
                    </Pressable>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
