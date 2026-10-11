import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDisplayUser, getFeed } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import useMainTabSwipe from '../../shared/navigation/useMainTabSwipe.js';
import { ReelItem } from '../../modules/social/components/ReelExperience.jsx';

const viewabilityConfig = { itemVisiblePercentThreshold: 80 };
export default function ReelsScreen() {
    const { session } = useSession();
    const screenFocused = useIsFocused();
    const tabSwipe = useMainTabSwipe('/(main)/reels');
    const [items, setItems] = useState([]);
    const [pageHeight, setPageHeight] = useState(0);
    const listRef = useRef(null);
    const [activeId, setActiveId] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const cursorRef = useRef(null);
    const hasMoreRef = useRef(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const requestLock = useRef(false);
    const controllerRef = useRef(null);
    const onViewableItemsChanged = useRef(({ viewableItems }) => {
        const item = viewableItems.find(({ item: post }) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'))?.item;
        setActiveId(item?.id ?? null);
    }).current;

    const load = useCallback(async (reset = false) => {
        if (requestLock.current || (!reset && !hasMoreRef.current)) return;
        requestLock.current = true;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true); setError('');
        try {
            const page = await getFeed(session.token, reset ? null : cursorRef.current, controller.signal, 'discover');
            const reels = page.data.filter((post) => post.kind === 'reel' && post.media?.some((asset) => asset.kind === 'video'));
            const authors = await Promise.all([...new Set(reels.map((post) => post.creator_id))].map(async (id) => [id, await getDisplayUser(session.token, id, controller.signal).catch(() => ({ id, name: 'WindChime member', username: null }))]));
            const mapped = reels.map((post) => ({ ...post, author: new Map(authors).get(post.creator_id) }));
            setItems((current) => reset ? mapped : [...current, ...mapped.filter((post) => !current.some((item) => item.id === post.id))]);
            cursorRef.current = page.pagination.next_cursor;
            hasMoreRef.current = Boolean(page.pagination.has_next_page);
            setHasMore(hasMoreRef.current);
            if (mapped[0]) setActiveId((current) => current || mapped[0].id);
        } catch (cause) { if (!controller.signal.aborted) setError(cause.message || 'Could not load Reels.'); }
        finally { if (!controller.signal.aborted) setLoading(false); requestLock.current = false; }
    }, [session.token]);

    useEffect(() => { load(true); return () => controllerRef.current?.abort(); }, [load]);

    return <SafeAreaView {...tabSwipe} style={{ flex: 1, backgroundColor: '#071214' }} edges={['top', 'bottom']}>
        {items.length ? <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => <ReelItem post={item} token={session.token} active={screenFocused && item.id === activeId} pageHeight={pageHeight} onEnded={() => { if (index + 1 < items.length) listRef.current?.scrollToIndex({ index: index + 1, animated: true }); }} />}
            ref={listRef}
            onLayout={(event) => setPageHeight(Math.round(event.nativeEvent.layout.height))}
            pagingEnabled
            snapToInterval={pageHeight || undefined}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onEndReached={() => { if (hasMore) load(); }}
            onEndReachedThreshold={0.8}
            windowSize={3}
            initialNumToRender={2}
            maxToRenderPerBatch={2}
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({ length: pageHeight, offset: pageHeight * index, index })}
        /> : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
            {loading ? <ActivityIndicator color={colors.lime} /> : <>
                <SymbolView name={{ ios: 'play.rectangle', android: 'play_circle', web: 'play_circle' }} tintColor={colors.lime} size={42} />
                <Text style={{ color: 'white', fontSize: 21, fontWeight: '800', marginTop: 15 }}>Reels, at your pace.</Text>
                <Text style={{ color: '#b7c6c0', textAlign: 'center', lineHeight: 21, marginTop: 7 }}>{error || 'Short videos from people and moments you may like will appear here.'}</Text>
                <Pressable onPress={() => load(items.length === 0 && hasMore && cursorRef.current === null)} style={{ marginTop: 18, padding: 12 }}><Text style={{ color: colors.lime, fontWeight: '800' }}>{hasMore && !error ? 'Find more Reels' : 'Try again'}</Text></Pressable>
            </>}
        </View>}
    </SafeAreaView>;
}
