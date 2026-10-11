import { MESSAGES_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

export const getConversations = (token, page = 1, search = '', signal) =>
    apiRequest(MESSAGES_API, `/conversations?page=${page}&search=${encodeURIComponent(search)}`, { token, signal });

export const getMessages = (token, id, { before, after, signal } = {}) => {
    const query = before ? `?before=${before}` : after ? `?after=${after}` : '';
    return apiRequest(MESSAGES_API, `/conversations/${id}/messages${query}`, { token, signal });
};

export async function sendMessage(token, id, content, clientMessageId) {
    const result = await apiRequest(MESSAGES_API, `/conversations/${id}/messages`, {
        token,
        method: 'POST',
        body: { content, client_message_id: clientMessageId },
    });
    return result.data;
}

export const markRead = (token, id, messageId) =>
    apiRequest(MESSAGES_API, `/conversations/${id}/read`, {
        token,
        method: 'PATCH',
        body: { message_id: messageId },
    });
