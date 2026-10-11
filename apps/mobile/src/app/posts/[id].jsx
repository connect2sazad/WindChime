import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addPostComment, getCommentSummary, getDisplayUser, getPostComments } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/comments.styles.js';

export default function PostCommentsScreen() {
    const { id } = useLocalSearchParams();
    const postId = String(id || '');
    const { session } = useSession();
    const [comments, setComments] = useState([]);
    const [replyCounts, setReplyCounts] = useState({});
    const [activeParent, setActiveParent] = useState(null);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async (signal) => {
        setLoading(true); setError('');
        try {
            const [list, summary] = await Promise.all([
                getPostComments(session.token, postId, signal),
                getCommentSummary(session.token, postId, signal),
            ]);
            const enriched = await Promise.all((list.data || []).map(async (comment) => {
                try { return { ...comment, author: await getDisplayUser(session.token, comment.creator_id, signal) }; }
                catch { return { ...comment, author: { name: 'WindChime member' } }; }
            }));
            setComments(enriched);
            setReplyCounts(summary.data?.reply_counts || {});
        } catch (cause) { if (!signal?.aborted) setError(cause.message || 'Could not load comments.'); }
        finally { if (!signal?.aborted) setLoading(false); }
    }, [postId, session.token]);

    useEffect(() => {
        const controller = new AbortController();
        load(controller.signal);
        return () => controller.abort();
    }, [load]);

    async function submit() {
        const content = draft.trim();
        if (!content || sending) return;
        setSending(true); setError('');
        try {
            await addPostComment(session.token, postId, content, activeParent?.id ?? null);
            setDraft(''); setActiveParent(null);
            await load();
        } catch (cause) { setError(cause.message || 'Your comment could not be posted.'); }
        finally { setSending(false); }
    }

    if (!session) return <Redirect href="/login" />;
    if (!/^\d+$/.test(postId)) return <Redirect href="/(main)" />;

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
                <View style={styles.header}><Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable><View><Text style={styles.title}>Conversation</Text><Text style={styles.subtitle}>Comments and replies</Text></View></View>
                {loading && !comments.length ? <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Loading comments…</Text></View> : null}
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <FlatList
                    data={comments}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={styles.list}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => <CommentThread item={item} count={replyCounts[item.id] || 0} token={session.token} postId={postId} onReply={() => setActiveParent(item)} />}
                    ListEmptyComponent={!loading && !error ? <View style={styles.empty}><Text style={styles.emptyTitle}>Start the conversation</Text><Text style={styles.emptyText}>Be the first to leave a thoughtful comment.</Text></View> : null}
                />
                {activeParent ? <View style={{ paddingHorizontal: 14, paddingTop: 8, backgroundColor: colors.white }}><Text style={styles.muted}>Replying to {activeParent.author?.name || 'a comment'}  <Text onPress={() => setActiveParent(null)} style={{ color: colors.green, fontWeight: '800' }}>Cancel</Text></Text></View> : null}
                <View style={styles.composer}>
                    <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder={activeParent ? 'Write a reply…' : 'Add a comment…'} placeholderTextColor={colors.muted} multiline maxLength={2000} onSubmitEditing={submit} />
                    <Pressable accessibilityRole="button" accessibilityLabel={activeParent ? 'Post reply' : 'Post comment'} disabled={!draft.trim() || sending} onPress={submit} style={[styles.send, (!draft.trim() || sending) && { opacity: 0.5 }]}>{sending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.sendText}>Post</Text>}</Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function CommentThread({ item, count, token, postId, onReply }) {
    const [replies, setReplies] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [loadingReplies, setLoadingReplies] = useState(false);
    const canExpand = count > 0;

    async function toggleReplies() {
        if (expanded) { setExpanded(false); return; }
        setLoadingReplies(true);
        try {
            const result = await getPostComments(token, postId, undefined, item.id);
            const enriched = await Promise.all((result.data || []).map(async (reply) => {
                try { return { ...reply, author: await getDisplayUser(token, reply.creator_id) }; }
                catch { return { ...reply, author: { name: 'WindChime member' } }; }
            }));
            setReplies(enriched); setExpanded(true);
        } finally { setLoadingReplies(false); }
    }

    return (
        <View style={styles.comment}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.author?.name || 'W').trim().slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.body}>
                <View style={styles.bubble}><Text style={styles.author}>{item.author?.name || 'WindChime member'}</Text><Text style={styles.text}>{item.content}</Text></View>
                <View style={styles.meta}><Text style={styles.metaButton}>{new Date(item.created_at).toLocaleDateString()}</Text><Text onPress={onReply} style={styles.metaButton}>Reply</Text>{canExpand ? <Text onPress={toggleReplies} style={styles.metaButton}>{loadingReplies ? 'Loading…' : expanded ? 'Hide replies' : `View ${count} ${count === 1 ? 'reply' : 'replies'}`}</Text> : null}</View>
                {expanded ? <View style={styles.nested}>{replies.map((reply) => <View key={reply.id} style={styles.reply}><View style={[styles.avatar, { width: 28, height: 28, borderRadius: 10 }]}><Text style={[styles.avatarText, { fontSize: 10 }]}>{(reply.author?.name || 'W').trim().slice(0, 1).toUpperCase()}</Text></View><View style={[styles.body, styles.bubble]}><Text style={styles.author}>{reply.author?.name || 'WindChime member'}</Text><Text style={styles.text}>{reply.content}</Text></View></View>)}</View> : null}
            </View>
        </View>
    );
}
