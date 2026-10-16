import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { deleteMessage, forwardMessage, getConnections, getMessages, markRead, sendMessage, setMessageReaction, removeMessageReaction, getTypingStatus, setTyping } from '../../modules/messages/api/messages.js';
import { getDisplayUser } from '../../modules/social/api/feed.js';
import { MESSAGES_API } from '../../shared/config/services.js';
import MessageVideo from '../../modules/messages/components/MessageVideo.jsx';
import ReactionIcon from '../../modules/social/components/ReactionIcon.jsx';
import Avatar from '../../shared/components/Avatar.jsx';
import Skeleton from '../../shared/components/Skeleton.jsx';
import relativeTime from '../../shared/utils/relativeTime.js';
import { sendReport } from '../../modules/safety/api/safety.js';
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
    const [peerTyping, setPeerTyping] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [emojiPicker, setEmojiPicker] = useState(false);
    const [forwarding, setForwarding] = useState(null);
    const [actionMessage, setActionMessage] = useState(null);
    const [friends, setFriends] = useState([]);
    const [forwardBusy, setForwardBusy] = useState(false);
    const [error, setError] = useState('');
    const scrollRef = useRef(null);
    const pollLock = useRef(false);
    const latestMessageId = useRef(null);
    const lastTap = useRef({ id: null, at: 0 });
    const lastTypingSent = useRef(0);
    const stopTypingTimer = useRef(null);

    const stopTyping = useCallback(() => {
        clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = null;
        if (token) setTyping(token, conversationId, false).catch(() => {});
    }, [conversationId, token]);

    const changeDraft = useCallback((value) => {
        setDraft(value);
        if (!value.trim()) { stopTyping(); return; }
        if (Date.now() - lastTypingSent.current > 1400) {
            lastTypingSent.current = Date.now();
            setTyping(token, conversationId, true).catch(() => {});
        }
        clearTimeout(stopTypingTimer.current);
        stopTypingTimer.current = setTimeout(stopTyping, 4300);
    }, [conversationId, stopTyping, token]);

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
        const typingTimer = setInterval(() => {
            getTypingStatus(token, conversationId, controller.signal).then((typing) => { if (active) setPeerTyping(typing); }).catch(() => {});
        }, 1800);
        return () => { active = false; controller.abort(); clearInterval(timer); clearInterval(typingTimer); stopTyping(); };
    }, [token, conversationId, peerId, sync, stopTyping]);

    useEffect(() => {
        if (messages.length) scrollRef.current?.scrollToEnd({ animated: true });
    }, [messages.length]);

    if (!session) return <Redirect href="/login" />;

    async function submit() {
        const content = draft.trim();
        if ((!content && !assets.length) || sending) return;
        setSending(true); setError('');
        stopTyping();
        try {
            const message = await sendMessage(session.token, conversationId, content, assets, { replyTo: replyingTo?.id });
            latestMessageId.current = message.id;
            setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
            setDraft('');
            setAssets([]);
            setReplyingTo(null);
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
        if (selected.some((asset) => {
            const videoFile = asset.type === 'video' || asset.mimeType?.startsWith('video/');
            return asset.fileSize > (videoFile ? 50 : 10) * 1024 * 1024;
        })) return setError('Photos must be 10 MB or smaller; videos must be 50 MB or smaller.');
        if (selected.some((asset) => asset.mimeType && !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(asset.mimeType))) return setError('Choose JPG, PNG, WebP, MP4, or WebM files.');
        setAssets(selected);
    }

    async function reactToMessage(item, type = 'like') {
        try {
            const mine = item.reactions?.find((reaction) => reaction.mine);
            const result = mine?.type === type
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

    async function showMessageActions(item) {
        setActionMessage(item);
    }

    function chooseMessageAction(action) {
        const item = actionMessage;
        setActionMessage(null);
        if (!item) return;
        if (action === 'reply') setReplyingTo(item);
        if (action === 'react') setReactionMenu(item.id);
        if (action === 'forward') chooseForward(item);
        if (action === 'report') reportMessage(item);
        if (action === 'delete') Alert.alert('Delete message?', 'This removes the message for both people.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeMessage(item) }]);
    }

    async function chooseForward(item) {
        setForwarding(item); setForwardBusy(true);
        try {
            const result = await getConnections(token, 'friends');
            const rows = await Promise.all((result.data || []).slice(0, 30).map(async (row) => {
                const userId = row.user_id || row.id;
                try { return await getDisplayUser(token, userId); } catch { return null; }
            }));
            setFriends(rows.filter(Boolean));
        } catch (cause) { setError(cause.message || 'Could not load friends to forward to.'); setForwarding(null); }
        finally { setForwardBusy(false); }
    }

    async function forwardTo(user) {
        setForwardBusy(true);
        try { await forwardMessage(token, conversationId, forwarding.id, user.id); setForwarding(null); Alert.alert('Forwarded', `Sent to ${user.name || user.username}.`); }
        catch (cause) { setError(cause.message || 'Could not forward this message.'); }
        finally { setForwardBusy(false); }
    }

    async function reportMessage(item) {
        try { await sendReport(token, { target_type: 'message', target_id: item.id, conversation_id: Number(conversationId), reason: 'other' }); Alert.alert('Report sent', 'Thanks for helping keep WindChime safe.'); }
        catch (cause) { setError(cause.message || 'Could not report this message.'); }
    }

    async function removeMessage(item) {
        try { await deleteMessage(token, conversationId, item.id); setMessages((current) => current.map((message) => message.id === item.id ? { ...message, deleted: true, content: '', attachments: [], reactions: [] } : message)); }
        catch (cause) { setError(cause.message || 'Could not delete this message.'); }
    }

    return (
        <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} hitSlop={10}><Text style={styles.back}>‹</Text></Pressable>
                <Pressable onPress={() => peer?.username && router.push(`/profiles/${peer.username}`)}><Avatar user={peer} token={token} size={39} style={styles.avatar} /></Pressable>
                <Pressable onPress={() => peer?.username && router.push(`/profiles/${peer.username}`)} style={styles.headerText}><Text style={styles.peerName}>{peer?.name || 'Friend'}</Text><Text style={styles.peerHandle}>{peerTyping ? 'Typing…' : peer?.username ? `@${peer.username}` : 'Your WindChime friend'}</Text></Pressable>
                <Text style={styles.headerMark}>✳</Text>
            </View>
            <KeyboardAvoidingView style={styles.body} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
                <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList} keyboardShouldPersistTaps="handled">
                    <Text style={styles.privacyNote}>A private conversation between friends.</Text>
                    {loading ? <Skeleton count={5} style={{ padding: 12 }} /> : null}
                    {!loading && !messages.length && !error ? <View style={styles.empty}><Text style={styles.emptyMark}>✳</Text><Text style={styles.emptyTitle}>Say a little hello.</Text><Text style={styles.emptyCopy}>Your conversation starts with one message.</Text></View> : null}
                    {messages.map((item) => <MessageBubble key={item.id} item={item} mine={item.sender_id === session.user.id} token={token} conversationId={conversationId} onDoubleTap={() => handleMessageTap(item)} onLongPress={() => showMessageActions(item)} onReply={() => setReplyingTo(item)} showReactions={reactionMenu === item.id} onReact={(type) => reactToMessage(item, type)} />)}
                    {peerTyping ? <View style={{ alignSelf: 'flex-start', marginLeft: 4, marginTop: 2, marginBottom: 8, paddingVertical: 8, paddingHorizontal: 13, borderRadius: 15, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.green, fontSize: 11, fontWeight: '700' }}>Typing…</Text></View> : null}
                    {error ? <Text style={styles.error}>{error}</Text> : null}
                </ScrollView>
                <View>
                    {replyingTo ? <View style={{ flexDirection: 'row', alignItems: 'center', padding: 9, backgroundColor: '#edf3e8', borderTopWidth: 1, borderTopColor: colors.border }}><View style={{ flex: 1 }}><Text style={{ color: colors.green, fontWeight: '800', fontSize: 10 }}>Replying to {replyingTo.sender_id === session.user.id ? 'yourself' : peer?.name || 'friend'}</Text><Text numberOfLines={1} style={{ color: colors.muted, fontSize: 10, marginTop: 2 }}>{replyingTo.content || 'Shared media'}</Text></View><Pressable accessibilityLabel="Cancel reply" onPress={() => setReplyingTo(null)}><Text style={{ color: colors.muted, fontSize: 20 }}>×</Text></Pressable></View> : null}
                    {assets.length ? <ScrollView horizontal style={styles.attachmentStrip} contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}>{assets.map((asset, index) => {
                        const videoFile = asset.type === 'video' || asset.mimeType?.startsWith('video/');
                        return <View key={`${asset.uri}-${index}`} style={styles.attachmentPreview}>
                            {videoFile ? <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}><Text style={{ color: colors.white, fontSize: 20 }}>▶</Text><Text numberOfLines={1} style={{ color: colors.white, fontSize: 8, maxWidth: 54 }}>{asset.fileName || 'Video'}</Text></View> : <Image source={{ uri: asset.uri }} style={{ width: 58, height: 58 }} contentFit="cover" />}
                            <Pressable onPress={() => setAssets((all) => all.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeAttachment}><Text style={{ color: colors.white }}>×</Text></Pressable>
                        </View>;
                    })}</ScrollView> : null}
                    <View style={styles.composer}>
                        <Pressable accessibilityLabel="Open emoji picker" onPress={() => setEmojiPicker((value) => !value)} style={styles.attachButton}><Text style={styles.attachGlyph}>☺</Text></Pressable>
                        <Pressable accessibilityLabel="Add photos" onPress={() => pickMedia(['images'])} style={styles.attachButton}><Text style={styles.attachGlyph}>▧</Text></Pressable>
                        <Pressable accessibilityLabel="Add video" onPress={() => pickMedia(['videos'])} style={styles.attachButton}><Text style={styles.attachGlyph}>▶</Text></Pressable>
                        <TextInput style={styles.input} value={draft} onChangeText={changeDraft} onBlur={stopTyping} placeholder="Write a message…" placeholderTextColor={colors.muted} multiline maxLength={4000} onSubmitEditing={submit} />
                        <Pressable accessibilityLabel="Send message" onPress={submit} disabled={(!draft.trim() && !assets.length) || sending} style={[styles.send, (!draft.trim() && !assets.length || sending) && styles.sendDisabled]}>{sending ? <ActivityIndicator color={colors.white} size="small" /> : <Text style={styles.sendText}>↑</Text>}</Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
            {emojiPicker ? <View style={{ maxHeight: 190, backgroundColor: colors.white, borderTopWidth: 1, borderColor: colors.border }}><ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6 }}>{['😀','😃','😄','😁','😆','😅','😂','🤣','😊','🙂','😉','😍','🥰','😘','😎','🤔','🥳','😭','😢','😡','👍','👎','👏','🙌','🙏','❤️','💚','✨','🎉','🔥'].map((emoji) => <Pressable key={emoji} onPress={() => setDraft((value) => value + emoji)} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 25 }}>{emoji}</Text></Pressable>)}</ScrollView></View> : null}
            <Modal visible={Boolean(forwarding)} transparent animationType="slide" onRequestClose={() => setForwarding(null)}>
                <Pressable onPress={() => setForwarding(null)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }}><Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: '70%', backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18 }}><Text style={{ color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Forward to a friend</Text>{forwardBusy ? <ActivityIndicator color={colors.green} /> : <ScrollView>{friends.map((user) => <Pressable key={user.id} onPress={() => forwardTo(user)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 }}><Avatar user={user} token={token} size={40} /><View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '700' }}>{user.name}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>@{user.username}</Text></View><Text style={{ color: colors.green, fontWeight: '800' }}>Send</Text></Pressable>)}</ScrollView>}<Pressable onPress={() => setForwarding(null)} style={{ alignItems: 'center', padding: 12 }}><Text style={{ color: colors.muted }}>Cancel</Text></Pressable></Pressable></Pressable>
            </Modal>
            <Modal visible={Boolean(actionMessage)} transparent animationType="fade" onRequestClose={() => setActionMessage(null)}><Pressable onPress={() => setActionMessage(null)} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.4)' }}><View style={{ backgroundColor: colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28 }}><Text style={{ color: colors.ink, fontSize: 17, fontWeight: '800', paddingBottom: 10 }}>Message options</Text>{[['reply', 'Reply'], ['react', 'Add a reaction'], ['forward', 'Forward'], ['report', 'Report']].map(([action, label]) => <Pressable key={action} onPress={() => chooseMessageAction(action)} style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }}><Text style={{ color: action === 'report' ? colors.danger : colors.ink, fontWeight: '700' }}>{label}</Text></Pressable>)}{actionMessage?.sender_id === session.user.id && !actionMessage?.deleted ? <Pressable onPress={() => chooseMessageAction('delete')} style={{ minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.border }}><Text style={{ color: colors.danger, fontWeight: '700' }}>Delete for everyone</Text></Pressable> : null}<Pressable onPress={() => setActionMessage(null)} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted }}>Cancel</Text></Pressable></View></Pressable></Modal>
        </SafeAreaView>
    );
}

function MessageBubble({ item, mine, token, conversationId, onDoubleTap, onLongPress, onReply, showReactions, onReact }) {
    const attachment = item.attachments?.[0];
    const content = item.deleted ? 'Message deleted' : item.content || (item.shared_post_id ? 'Shared a post' : attachment ? `Shared a ${attachment.kind}` : '');
    const time = relativeTime(item.created_at);
    const touchStart = useRef(null);
    return <View onTouchStart={(event) => { touchStart.current = event.nativeEvent.pageX; }} onTouchEnd={(event) => { const delta = event.nativeEvent.pageX - (touchStart.current ?? event.nativeEvent.pageX); if (Math.abs(delta) > 70) onReply?.(); touchStart.current = null; }} style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
        <Pressable onPress={onDoubleTap} onLongPress={onLongPress} delayLongPress={420} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
            {item.reply?.content ? <Text style={[styles.replyQuote, mine && styles.timeMine]} numberOfLines={2}>{item.reply.content}</Text> : null}
            {item.shared_post_id ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>Shared a post</Text> : null}
            {item.attachments?.map((file) => file.kind === 'video'
                ? <MessageVideo key={file.index} conversationId={conversationId} messageId={item.id} mediaIndex={file.index} token={token} />
                : <Image key={file.index} source={{ uri: `${MESSAGES_API}/conversations/${conversationId}/messages/${item.id}/media/${file.index}`, headers: { Authorization: `Bearer ${token}` } }} style={{ width: 220, height: 220, borderRadius: 12, marginBottom: 5 }} contentFit="cover" onError={() => {}} />)}
            {content ? <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{content}</Text> : null}
            {!!item.reactions?.length ? <View style={styles.reactionSummary}>{item.reactions.map((reaction) => <View key={reaction.type} style={styles.reactionBadge}><ReactionIcon type={reaction.type} size={14} /><Text style={{ color: colors.ink, fontSize: 10, marginLeft: 4 }}>{reaction.count}</Text></View>)}</View> : null}
            <Text style={[styles.time, mine && styles.timeMine]}>{time} ago</Text>
        </Pressable>
        {showReactions ? <View style={styles.reactionPicker}>{['like', 'love', 'laugh', 'sad', 'angry'].map((type) => <Pressable key={type} accessibilityLabel={`${type} reaction`} onPress={() => onReact(type)}><ReactionIcon type={type} size={24} /></Pressable>)}</View> : null}
    </View>;
}
