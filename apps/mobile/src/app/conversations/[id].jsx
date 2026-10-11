import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMessages, markRead, sendMessage } from '../../modules/messages/api/messages.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { useSession } from '../../shared/session/useSession.js';
import colors from '../../styles/colors.js';
import styles from '../../styles/conversation.styles.js';

export default function ConversationScreen() {
    const { id, peer_id } = useLocalSearchParams();
    const { session } = useSession();
    const token = session?.token;
    const conversationId = String(id || '');
    const peerId = Number(peer_id);
    const [peer, setPeer] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef(null);
    const pollLock = useRef(false);
    const latestMessageId = useRef(null);

    const sync = useCallback(async (initial = false, signal) => {
        if (pollLock.current) return;
        pollLock.current = true;
        try {
            const response = await getMessages(session.token, conversationId, {
                ...(!initial && latestMessageId.current ? { after: latestMessageId.current } : {}),
                signal,
            });
            const received = response.data || [];
            setMessages((current) => {
                const known = new Set(current.map((item) => item.id));
                const added = received.filter((item) => !known.has(item.id));
                return initial ? received : [...current, ...added];
            });
            const latest = received.at(-1)?.id || latestMessageId.current;
            if (latest) {
                latestMessageId.current = latest;
                markRead(session.token, conversationId, latest).catch(() => {});
            }
            setError('');
        } catch (cause) {
            if (!signal?.aborted) setError(cause.message || 'Could not load this conversation.');
        } finally {
            pollLock.current = false;
            if (initial && !signal?.aborted) setLoading(false);
        }
    }, [conversationId, session.token]);

    useEffect(() => {
        if (!token || !conversationId || !Number.isSafeInteger(peerId)) return;
        let active = true;
        const controller = new AbortController();
        getDisplayUser(token, peerId, controller.signal).then((value) => { if (active) setPeer(value); }).catch(() => {});
        sync(true, controller.signal);
        const timer = setInterval(() => { if (active) sync(false); }, 5000);
        return () => { active = false; controller.abort(); clearInterval(timer); };
    }, [token, conversationId, peerId, sync]);

    useEffect(() => {
        if (messages.length) scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages.length]);

    if (!session) return <Redirect href="/login" />;

    async function submit() {
        const content = draft.trim();
        if (!content || sending) return;
        setSending(true); setError('');
        try {
            const message = await sendMessage(session.token, conversationId, content, `${Date.now()}-${Math.random().toString(16).slice(2)}`);
            latestMessageId.current = message.id;
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
            setDraft('');
        } catch (cause) { setError(cause.message || 'Message was not sent.'); }
        finally { setSending(false); }
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(peer?.name || 'W').slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.headerText}><Text style={styles.peerName}>{peer?.name || 'Friend'}</Text><Text style={styles.peerHandle}>{peer?.username ? `@${peer.username}` : 'Your WindChime friend'}</Text></View>
                <Text style={styles.headerMark}>✳</Text>
            </View>
            <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={82}>
                <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled">
                    <Text style={styles.privacyNote}>A private conversation between friends.</Text>
                    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Opening your conversation…</Text></View> : null}
                    {!loading && !messages.length && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>Say a little hello.</Text><Text style={styles.emptyCopy}>Your conversation starts with one message.</Text></View> : null}
                    {messages.map((item) => <MessageBubble key={item.id} item={item} mine={item.sender_id === session.user.id} />)}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </ScrollView>
                <View style={styles.composer}>
                    <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor={colors.muted} multiline maxLength={4000} onSubmitEditing={submit} />
                    <Pressable accessibilityLabel="Send message" onPress={submit} disabled={!draft.trim() || sending} style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}>{sending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function MessageBubble({ item, mine }) {
    const attachment = item.attachments?.[0];
    const content = item.deleted ? 'Message deleted' : item.content || (item.shared_post_id ? 'Shared a post' : attachment ? `Shared a ${attachment.kind}` : '');
    const time = item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
    return <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}><View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}><Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{content}</Text><Text style={[styles.time, mine && styles.timeMine]}>{time}</Text></View></View>;
}
