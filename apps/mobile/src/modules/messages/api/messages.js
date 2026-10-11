import { MESSAGES_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';
import { File } from 'expo-file-system';

export const getConversations = (token, page = 1, search = '', signal) =>
    apiRequest(MESSAGES_API, `/conversations?page=${page}&search=${encodeURIComponent(search)}`, { token, signal });

export async function getUnreadChatCount(token, signal) {
    const result = await apiRequest(MESSAGES_API, '/conversations/unread-count', { token, signal });
    return result.data.count;
}

export const setTyping = (token, conversationId, typing) => apiRequest(
    MESSAGES_API, `/conversations/${conversationId}/typing`, { token, method: 'PUT', body: { typing } },
);

export const getTypingStatus = async (token, conversationId, signal) => {
    const result = await apiRequest(MESSAGES_API, `/conversations/${conversationId}/typing`, { token, signal });
    return result.data.typing;
};

export const getMessages = (token, id, { before, after, signal } = {}) => {
    const query = before ? `?before=${before}` : after ? `?after=${after}` : '';
    return apiRequest(MESSAGES_API, `/conversations/${id}/messages${query}`, { token, signal });
};

export async function startConversation(token, recipientId) {
    const result = await apiRequest(MESSAGES_API, '/conversations', { token, method: 'POST', body: { recipient_id: recipientId } });
    return result.data;
}

function uuid() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const value = Math.floor(Math.random() * 16);
        return (char === 'x' ? value : (value & 3) | 8).toString(16);
    });
}

export async function sendMessage(token, id, content, assets = [], { replyTo, postId } = {}) {
    const body = new FormData();
    body.append('content', content);
    body.append('client_message_id', uuid());
    if (replyTo) body.append('reply_to_id', String(replyTo));
    if (postId) body.append('shared_post_id', String(postId));
    for (const [index, asset] of assets.entries()) {
        const extension = (asset.fileName?.split('.').pop()?.toLowerCase() || '').replace(/[^a-z0-9]/g, '');
        const video = asset.type === 'video' || asset.mimeType?.startsWith('video/') || ['mp4', 'webm'].includes(extension);
        const mimeByExtension = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', mp4: 'video/mp4', webm: 'video/webm' };
        const mimeType = asset.mimeType?.toLowerCase() || mimeByExtension[extension] || (video ? 'video/mp4' : 'image/jpeg');
        if (!asset.uri) throw new Error('A selected media file is missing its local URI. Select it again.');
        if (!mimeByExtension[extension] && !asset.mimeType && !(video && asset.type === 'video')) throw new Error('WindChime could not identify this file type. Choose a JPG, PNG, WebP, MP4, or WebM file.');
        const file = new File(asset.uri);
        const filename = asset.fileName || `windchime-message-${Date.now()}-${index}.${mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]}`;
        body.append('media', file, filename);
    }
    const result = await apiRequest(MESSAGES_API, `/conversations/${id}/messages`, {
        token,
        method: 'POST',
        body,
        timeoutMs: 120000,
    });
    return result.data;
}

export const setMessageReaction = (token, conversationId, messageId, type) => apiRequest(
    MESSAGES_API, `/conversations/${conversationId}/messages/${messageId}/reaction`, { token, method: 'PUT', body: { type } },
);

export const removeMessageReaction = (token, conversationId, messageId) => apiRequest(
    MESSAGES_API, `/conversations/${conversationId}/messages/${messageId}/reaction`, { token, method: 'DELETE' },
);

export async function forwardMessage(token, conversationId, messageId, recipientId) {
    const result = await apiRequest(MESSAGES_API, `/conversations/${conversationId}/messages/${messageId}/forward`, {
        token, method: 'POST', body: { recipient_id: recipientId, client_message_id: uuid() },
    });
    return result.data;
}

export const deleteMessage = (token, conversationId, messageId) => apiRequest(
    MESSAGES_API, `/conversations/${conversationId}/messages/${messageId}`, { token, method: 'DELETE' },
);

export const markRead = (token, id, messageId) =>
    apiRequest(MESSAGES_API, `/conversations/${id}/read`, {
        token,
        method: 'PATCH',
        body: { message_id: messageId },
    });
