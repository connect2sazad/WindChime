import { MESSAGES_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

export const getConversations = (token, page = 1, search = '', signal) =>
    apiRequest(MESSAGES_API, `/conversations?page=${page}&search=${encodeURIComponent(search)}`, { token, signal });

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

export async function sendMessage(token, id, content, assets = []) {
    const body = new FormData();
    body.append('content', content);
    body.append('client_message_id', uuid());
    for (const [index, asset] of assets.entries()) {
        const video = asset.type === 'video' || asset.mimeType?.startsWith('video/');
        const extension = asset.fileName?.split('.').pop()?.toLowerCase() || (video ? 'mp4' : 'jpg');
        body.append('media', {
            uri: asset.uri,
            name: asset.fileName || `windchime-message-${Date.now()}-${index}.${extension}`,
            type: asset.mimeType || (video ? 'video/mp4' : extension === 'png' ? 'image/png' : 'image/jpeg'),
        });
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

export const markRead = (token, id, messageId) =>
    apiRequest(MESSAGES_API, `/conversations/${id}/read`, {
        token,
        method: 'PATCH',
        body: { message_id: messageId },
    });
