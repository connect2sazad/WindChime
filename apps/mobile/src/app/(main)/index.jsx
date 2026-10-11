import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getDisplayUser, getFeed, getMediaUrl, getPostSummary, removePostReaction, removeRepost, setPostReaction, setRepost } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/feed.styles.js';
import PostVideo from '../../modules/social/components/PostVideo.jsx';

export default function FeedScreen() {
    const { session } = useSession();
    const [mode, setMode] = useState('network');
    const [posts, setPosts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const requestLock = useRef(false);
    const requestController = useRef(null);
    const requestId = useRef(0);
    const cursor = useRef(null);
    const canLoadMore = useRef(false);

    const loadPage = useCallback(async ({ reset = false, pull = false } = {}) => {
        if (requestLock.current || (!reset && !canLoadMore.current)) return;
        requestLock.current = true;
        const controller = new AbortController();
        const currentRequest = ++requestId.current;
        requestController.current = controller;
        if (pull) setRefreshing(true);
        else if (reset) setLoading(true);
        else setLoadingMore(true);
        setError('');
        try {
            const response = await getFeed(session.token, reset ? null : cursor.current, controller.signal, mode);
            const uniqueCreators = [...new Set(response.data.map((post) => post.creator_id))];
            const userResults = await Promise.all(uniqueCreators.map(async (id) => {
                if (id === session.user.id) return [id, session.user];
                try { return [id, await getDisplayUser(session.token, id, controller.signal)]; }
                catch { return [id, { id, name: 'WindChime member', username: null }]; }
            }));
            const authors = new Map(userResults);
            const next = response.data.map((post) => ({ ...post, author: authors.get(post.creator_id) }));
            if (currentRequest !== requestId.current) return;
            setPosts((current) => reset ? next : [...current, ...next.filter((post) => !current.some((item) => item.id === post.id))]);
            setPagination(response.pagination);
            cursor.current = response.pagination.next_cursor;
            canLoadMore.current = response.pagination.has_next_page;
        } catch (cause) {
            if (currentRequest === requestId.current) setError(cause.message || 'Could not load the feed.');
        } finally {
            if (requestController.current === controller) {
                requestController.current = null;
                requestLock.current = false;
            }
            if (currentRequest === requestId.current) {
                setLoading(false);
                setRefreshing(false);
                setLoadingMore(false);
            }
        }
    }, [mode, session.token, session.user]);

    useFocusEffect(useCallback(() => {
        cursor.current = null;
        canLoadMore.current = false;
        const timer = setTimeout(() => loadPage({ reset: true }), 0);
        return () => {
            clearTimeout(timer);
            requestId.current += 1;
            requestController.current?.abort();
            requestController.current = null;
            requestLock.current = false;
        };
    }, [loadPage]));

    const changeMode = (nextMode) => {
        if (nextMode === mode) return;
        requestId.current += 1;
        requestController.current?.abort();
        requestController.current = null;
        requestLock.current = false;
        cursor.current = null;
        canLoadMore.current = false;
        setPagination(null);
        setPosts([]);
        setLoading(true);
        setError('');
        setMode(nextMode);
    };

    const refresh = () => {
        requestId.current += 1;
        requestController.current?.abort();
        requestController.current = null;
        requestLock.current = false;
        cursor.current = null;
        canLoadMore.current = false;
        setPagination(null);
        loadPage({ reset: true, pull: true });
    };

    const footer = loadingMore ? <ActivityIndicator style={styles.listFooter} color={colors.green} /> : pagination?.has_next_page ? <Pressable style={styles.moreButton} onPress={() => loadPage()}><Text style={styles.moreText}>Load more moments</Text></Pressable> : <Text style={styles.endNote}>{posts.length ? 'You’re all caught up for now.' : ''}</Text>;

    return (
        <View style={styles.screen}>
            <FlatList
                data={posts}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.green} colors={[colors.green]} />}
                onEndReachedThreshold={0.45}
                onEndReached={() => { if (pagination?.has_next_page) loadPage(); }}
                ListHeaderComponent={
                    <View>
                        <View style={styles.topline}><View><View style={styles.brandRow}><Text style={styles.brand}>windchime</Text><Text style={styles.brandMark}>✳</Text></View><Text style={styles.greeting}>A little closer, every day</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push('/(main)/notifications')} style={styles.headerAction}><Text style={styles.headerActionText}>♧</Text></Pressable></View>
                        <Text style={styles.headline}>A little <Text style={styles.headlineAccent}>connection.</Text></Text>
                        <Text style={styles.subhead}>Your latest conversations, in one calm place.</Text>
                        <View style={styles.modeBar}>
                            <ModeButton title="Your people" active={mode === 'network'} onPress={() => changeMode('network')} />
                            <ModeButton title="Discover" active={mode === 'discover'} onPress={() => changeMode('discover')} />
                        </View>
                        <Text style={styles.sectionTitle}>{mode === 'network' ? 'From your corner' : 'A few new voices'}</Text>
                    {error ? <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => loadPage({ reset: !posts.length })}><Text style={styles.retry}>Try again</Text></Pressable></View> : null}
                        {loading && !posts.length ? <View style={styles.loadingCard}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Finding your latest moments…</Text></View> : null}
                    </View>
                }
                renderItem={({ item }) => <PostCard post={item} token={session.token} />}
                ListEmptyComponent={!loading && !error ? <View style={styles.emptyCard}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>It’s quiet here.</Text><Text style={styles.emptyText}>{mode === 'network' ? 'Follow someone or add a friend to bring their moments into your feed.' : 'There are no public moments to discover yet. Try again soon.'}</Text></View> : null}
                ListFooterComponent={footer}
            />
        </View>
    );
}

function ModeButton({ title, active, onPress }) {
    return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.modeButton, active && styles.modeButtonActive]}><Text style={[styles.modeText, active && styles.modeTextActive]}>{title}</Text></Pressable>;
}

function PostCard({ post, token }) {
    const { width: windowWidth } = useWindowDimensions();
    const imageWidth = Math.min(windowWidth - 64, 590);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [summary, setSummary] = useState(null);
    const [actionError, setActionError] = useState('');
    const [actionBusy, setActionBusy] = useState(false);
    const media = [...(post.media || [])].sort((a, b) => a.sort_order - b.sort_order);
    const authorName = post.author?.name || 'WindChime member';
    const time = post.created_at ? new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';

    useEffect(() => {
        const controller = new AbortController();
        getPostSummary(token, post.id, controller.signal).then(setSummary).catch(() => {});
        return () => controller.abort();
    }, [post.id, token]);

    async function toggleReaction() {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try {
            if (summary?.reaction?.my_reaction) await removePostReaction(token, post.id);
            else await setPostReaction(token, post.id, 'like');
            setSummary(await getPostSummary(token, post.id));
        } catch (cause) { setActionError(cause.message || 'Could not update your reaction.'); }
        finally { setActionBusy(false); }
    }

    async function toggleReshare() {
        if (actionBusy) return;
        setActionBusy(true); setActionError('');
        try {
            if (summary?.repost?.reposted) await removeRepost(token, post.id);
            else await setRepost(token, post.id);
            setSummary(await getPostSummary(token, post.id));
        } catch (cause) { setActionError(cause.message || 'Could not reshare this post.'); }
        finally { setActionBusy(false); }
    }

    return (
        <View style={styles.postCard}>
            <View style={styles.postHeader}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{authorName.trim().slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.authorBlock}><Text style={styles.authorName} numberOfLines={1}>{authorName}</Text><Text style={styles.authorMeta}>{post.author?.username ? `@${post.author.username}  ·  ` : ''}{time}</Text></View>
                <Text style={styles.postMark}>✳</Text>
            </View>
            <Text style={styles.postLabel}>A SHARED MOMENT</Text>
            {post.content ? <Text style={styles.postText}>{post.content}</Text> : null}
            {media.length ? (
                <View style={styles.mediaFrame}>
                    {media[0].kind === 'image' ? (
                        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width))}>
                            {media.map((asset, index) => <Image key={asset.id} source={{ uri: getMediaUrl(post.id, asset.id), headers: { Authorization: `Bearer ${token}` } }} style={[styles.mediaImage, { width: imageWidth, height: imageWidth * 1.05 }]} resizeMode="cover" accessibilityLabel={`Post photo ${index + 1}`} />)}
                        </ScrollView>
                    ) : <PostVideo postId={post.id} mediaId={media[0].id} token={token} kind={post.kind} />}
                    {media.length > 1 ? <View style={styles.mediaCount}><Text style={styles.mediaCountText}>{photoIndex + 1} / {media.length}</Text></View> : null}
                </View>
            ) : null}
            {post.kind === 'reel' ? <View style={styles.kindPill}><Text style={styles.kindText}>REEL</Text></View> : null}
            {actionError ? <Text style={styles.actionError}>{actionError}</Text> : null}
            <View style={styles.actionRow}>
                <Pressable disabled={actionBusy} onPress={toggleReaction} style={styles.socialAction}><Text style={[styles.socialIcon, summary?.reaction?.my_reaction && styles.socialIconActive]}>{summary?.reaction?.my_reaction ? '♥' : '♡'}</Text><Text style={[styles.socialActionText, summary?.reaction?.my_reaction && styles.socialActionActive]}>{summary?.reaction?.total ?? 'Like'}</Text></Pressable>
                <Pressable onPress={() => router.push(`/posts/${post.id}`)} style={styles.socialAction}><Text style={styles.socialIcon}>◌</Text><Text style={styles.socialActionText}>{summary?.comments?.total ?? 'Comment'}</Text></Pressable>
                <Pressable disabled={actionBusy} onPress={toggleReshare} style={styles.socialAction}><Text style={styles.socialIcon}>⇄</Text><Text style={[styles.socialActionText, summary?.repost?.reposted && styles.socialActionActive]}>{summary?.repost?.total ?? 0} Share</Text></Pressable>
            </View>
            <View style={styles.postFooter}><Text style={styles.footerHint}>A moment shared</Text><Text style={styles.postDate}>{time}</Text></View>
        </View>
    );
}
