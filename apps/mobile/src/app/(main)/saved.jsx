import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { getDisplayUser, getSavedPosts } from '../../modules/social/api/feed.js';
import ProfilePostCard from '../../modules/social/components/ProfilePostCard.jsx';
import { ReelViewer } from '../../modules/social/components/ReelExperience.jsx';
import { useSession } from '../../shared/session/useSession.js';
import Skeleton from '../../shared/components/Skeleton.jsx';
import colors from '../../styles/colors.js';

export default function SavedScreen() {
    const { session } = useSession();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeReelId, setActiveReelId] = useState(null);
    const savedReels = posts.filter((post) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'));

    useFocusEffect(useCallback(() => {
        const controller = new AbortController();
        let active = true;
        setLoading(true); setError('');
        (async () => {
            try {
                const saved = await getSavedPosts(session.token, controller.signal);
                const authors = new Map(await Promise.all([...new Set(saved.map((post) => post.creator_id))].map(async (id) => {
                    try { return [id, await getDisplayUser(session.token, id, controller.signal)]; }
                    catch { return [id, { id, name: 'WindChime member' }]; }
                })));
                if (active) setPosts(saved.map((post) => ({ ...post, author: authors.get(post.creator_id) })));
            } catch (cause) { if (active) setError(cause.message || 'Saved moments could not be loaded.'); }
            finally { if (active) setLoading(false); }
        })();
        return () => { active = false; controller.abort(); };
    }, [session.token]));

    return <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.paper }}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }}>
            <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={{ width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}><SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} tintColor={colors.ink} size={19} /></Pressable>
            <Text style={{ color: colors.ink, fontSize: 30, fontWeight: '800', marginTop: 18 }}>Saved moments</Text>
            <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: 18 }}>Only you can see what you save. Keep the ideas and memories you want to find again.</Text>
            {loading ? <Skeleton variant="feed" count={3} style={{ marginTop: 8 }} /> : error ? <View style={{ padding: 18, borderRadius: 16, backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1 }}><Text style={{ color: colors.danger }}>{error}</Text><Pressable onPress={() => router.replace('/(main)/saved')} style={{ marginTop: 12 }}><Text style={{ color: colors.green, fontWeight: '700' }}>Try again</Text></Pressable></View> : posts.length ? posts.map((post) => <ProfilePostCard key={post.id} post={post} token={session.token} layout="list" onOpenReel={setActiveReelId} />) : <View style={{ padding: 22, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', marginTop: 20 }}><SymbolView name={{ ios: 'bookmark', android: 'bookmark_border', web: 'bookmark_border' }} tintColor={colors.green} size={30} /><Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 12 }}>Your collection starts here</Text><Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 20, marginTop: 6 }}>Open a moment’s options and choose “Save for later”. Your saved moments stay private.</Text><Pressable onPress={() => router.replace('/(main)')} style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13, backgroundColor: colors.ink, marginTop: 16 }}><Text style={{ color: colors.white, fontWeight: '700' }}>Explore moments</Text></Pressable></View>}
        </ScrollView>
        <ReelViewer visible={activeReelId !== null} posts={savedReels} initialPostId={activeReelId} token={session.token} onActiveChange={setActiveReelId} onClose={() => setActiveReelId(null)} />
    </SafeAreaView>;
}
