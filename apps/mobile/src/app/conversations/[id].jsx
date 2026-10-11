import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { getMessages, markRead, sendMessage, setMessageReaction, removeMessageReaction } from '../../modules/messages/api/messages.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { MESSAGES_API } from '../../shared/config/services.js';
import MessageVideo from '../../modules/messages/components/MessageVideo.jsx';
import Avatar from '../../shared/components/Avatar.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
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
    const [assets, setAssets] = useState([]);
    const [reactionMenu, setReactionMenu] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef(null);
    const pollLock = useRef(false);
    const latestMessageId = useRef(null);
    const lastTap = useRef({ id: null, at: 0 });

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
        if ((!content && !assets.length) || sending) return;
        setSending(true); setError('');
        try {
            const message = await sendMessage(session.token, conversationId, content, assets);
            latestMessageId.current = message.id;
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
            setDraft('');
            setAssets([]);
        } catch (cause) { setError(cause.message || 'Message was not sent.'); }
        finally { setSending(false); }
    }

    async function pickMedia(mediaTypes) {
        setError('');
        const imagesOnly = mediaTypes.length === 1 && mediaTypes[0] === 'images';
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes, allowsMultipleSelection: imagesOnly, selectionLimit: 5, quality: 0.9 });
        if (result.canceled) return;
        const selected = (result.assets || []).slice(0, 5);
        const video = selected.some((asset) => asset.type === 'video' || asset.mimeType?.startsWith('video/'));
        if (video && selected.length > 1) return setError('Send one video at a time.');
        if (selected.some((asset) => asset.fileSize > 50 * 1024 * 1024)) return setError('Each file must be 50 MB or smaller.');
        if (selected.some((asset) => asset.mimeType && !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(asset.mimeType))) return setError('Choose JPG, PNG, WebP, MP4, or WebM files.');
        setAssets(selected);
    }

    async function reactToMessage(item, type = 'like') {
        try {
            const mine = item.reactions?.some((reaction) => reaction.mine);
            const result = mine && type === 'like'
                ? await removeMessageReaction(session.token, conversationId, item.id)
                : await setMessageReaction(session.token, conversationId, item.id, type);
            const updated = result?.data;
            if (updated) setMessages((current) => current.map((message) => message.id === item.id ? updated : message));
        } catch (cause) { setError(cause.message || 'Could not update this reaction.'); }
        finally { setReactionMenu(null); }
    }

    function handleMessageTap(item) {
        const now = Date.now();
        if (lastTap.current.id === item.id && now - lastTap.current.at < 320) {
            lastTap.current = { id: null, at: 0 };
            reactToMessage(item);
        } else lastTap.current = { id: item.id, at: now };
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable>
                <Pressable onPress={() => peer?.username && router.push(`/profiles/${peer.username}`)}><Avatar user={peer} token={token} size={39} style={styles.avatar} /></Pressable>
                <Pressable onPress={() => peer?.username && router.push(`/profiles/${peer.username}`)} style={styles.headerText}><Text style={styles.peerName}>{peer?.name || 'Friend'}</Text><Text style={styles.peerHandle}>{peer?.username ? `@${peer.username}` : 'Your WindChime friend'}</Text></Pressable>
                <Text style={styles.headerMark}>✳</Text>
            </View>
            <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
                <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled">
                    <Text style={styles.privacyNote}>A private conversation between friends.</Text>
                    {loading ? <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Opening your conversation…</Text></View> : null}
                    {!loading && !messages.length && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>Say a little hello.</Text><Text style={styles.emptyCopy}>Your conversation starts with one message.</Text></View> : null}
                    {messages.map((item) => <MessageBubble key={item.id} item={item} mine={item.sender_id === session.user.id} token={token} conversationId={conversationId} onDoubleTap={() => handleMessageTap(item)} onLongPress={() => setReactionMenu(item.id)} showReactions={reactionMenu === item.id} onReact={(type) => reactToMessage(item, type)} />)}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </ScrollView>
                <View>
                    {assets.length ? <ScrollView horizontal style={styles.attachmentStrip} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>{assets.map((asset, index) => <View key={`${asset.uri}-${index}`} style={styles.attachmentPreview}><Image source={{ uri: asset.uri }} style={{ width: 58, height: 58 }} contentFit="cover" /><Pressable onPress={() => setAssets((all) => all.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeAttachment}><Text style={{ color: colors.white }}>×</Text></Pressable></View>)}</ScrollView> : null}
                    <View style={styles.composer}>
                        <Pressable accessibilityLabel="Add photos" onPress={() => pickMedia(['images'])} style={styles.attachButton}><Text style={styles.attachGlyph}>▧</Text></Pressable>
                        <Pressable accessibilityLabel="Add video" onPress={() => pickMedia(['videos'])} style={styles.attachButton}><Text style={styles.attachGlyph}>▶</Text></Pressable>
                        <TextInput style={styles.input} value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor={colors.muted} multiline maxLength={4000} onSubmitEditing={submit} />
                        <Pressable accessibilityLabel="Send message" onPress={submit} disabled={(!draft.trim() && !assets.length) || sending} style={[styles.send, (!draft.trim() && !assets.length || sending) && styles.sendDisabled]}>{sending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function MessageBubble({ item, mine, token, conversationId, onDoubleTap, onLongPress, showReactions, onReact }) {
    const attachment = item.attachments?.[0];
    const content = item.deleted ? 'Message deleted' : item.content || (item.shared_post_id ? 'Shared a post' : attachment ? `Shared a ${attachment.kind}` : '');
    const time = relativeTime(item.created_at);
    return <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
        <Pressable onPress={onDoubleTap} onLongPress={onLongPress} delayLongPress={380} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
            {item.reply?.content ? <Text style={[styles.replyQuote, mine && styles.timeMine]} numberOfLines={2}>{item.reply.content}</Text> : null}
            {item.shared_post_id ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>Shared a post</Text> : null}
            {item.attachments?.map((file) => file.kind === 'video'
                ? <MessageVideo key={file.index} conversationId={conversationId} messageId={item.id} mediaIndex={file.index} token={token} />
                : <Image key={file.index} source={{ uri: `${MESSAGES_API}/conversations/${conversationId}/messages/${item.id}/media/${file.index}`, headers: { Authorization: `Bearer ${token}` } }} style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 5 }} contentFit="cover" onError={() => {}} />)}
            {content ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{content}</Text> : null}
            {!!item.reactions?.length ? <View style={styles.reactionSummary}>{item.reactions.map((reaction) => <Text key={reaction.type} style={styles.reactionBadge}>{({ like: '👍', love: '❤️', laugh: '😂', sad: '😢', angry: '😠' })[reaction.type]} {reaction.count}</Text>)}</View> : null}
            <Text style={[styles.time, mine && styles.timeMine]}>{time} ago</Text>
        </Pressable>
        {showReactions ? <View style={styles.reactionPicker}>{['like', 'love', 'laugh', 'sad', 'angry'].map((type) => <Pressable key={type} onPress={() => onReact(type)}><Text style={styles.pickerEmoji}>{({ like: '👍', love: '❤️', laugh: '😂', sad: '😢', angry: '😠' })[type]}</Text></Pressable>)}</View> : null}
    </View>;
}
