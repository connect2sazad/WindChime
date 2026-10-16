import { apiRequest, SOCIAL_API } from '../../../shared/api/request.js';
const recentInsightViews = new Map();
// Social-service requests for posts, feeds, reshares, and protected media.
export async function updatePost(token, id, content) {
    const result = await apiRequest(SOCIAL_API, `/posts/${id}`, {
        token,
        method: 'PATCH',
        body: { content },
    });
    if (result.data?.id !== id)
        throw new Error('Could not confirm the updated post. Refresh before retrying.');
    return result.data;
}
export async function deletePost(token, id) {
    await apiRequest(SOCIAL_API, `/posts/${id}`, { token, method: 'DELETE' });
}
export async function getPosts(token, signal, page = 1) {
    const body = await apiRequest(SOCIAL_API, `/posts?page=${page}&limit=10&status=true`, {
        token,
        signal,
    });
    if (!Array.isArray(body.data)) throw new Error('Unexpected posts response');
    return body;
}
export async function createPost(token, content, { kind = 'post', files = [], thumbnail = null } = {}) {
    let payload = { content, kind };
    if (files.length) {
        payload = new FormData();
        payload.append('content', content);
        payload.append('kind', kind);
        for (const file of files) payload.append('media', file);
        if (thumbnail) payload.append('thumbnail', thumbnail);
    }
    const body = await apiRequest(SOCIAL_API, '/posts', {
        token,
        method: 'POST',
        body: payload,
        timeoutMs: 600000,
    });
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected post response');
    return body.data;
}

export async function getUserPosts(token, userId, page = 1, signal, type = 'all') {
    return apiRequest(SOCIAL_API, `/profiles/${userId}/posts?page=${page}&limit=10&type=${type}`, {
        token,
        signal,
    });
}
export async function getUserReshares(token, userId, page = 1, signal) {
    return apiRequest(SOCIAL_API, `/profiles/${userId}/reshares?page=${page}&limit=10`, {
        token,
        signal,
    });
}
export async function getMediaBlob(token, postId, mediaId, signal) {
    return apiRequest(SOCIAL_API, `/posts/${postId}/media/${mediaId}`, {
        token,
        signal,
        responseType: 'blob',
        timeoutMs: 120000,
    });
}

export async function getMediaThumbnailBlob(token, postId, mediaId, signal) {
    return apiRequest(SOCIAL_API, `/posts/${postId}/media/${mediaId}/thumbnail`, {
        token,
        signal,
        responseType: 'blob',
        timeoutMs: 30000,
    });
}

export async function getPersonalizedFeed(token, signal, cursorOrPage = null, mode = 'network') {
    const paging = Number.isInteger(cursorOrPage)
        ? `page=${cursorOrPage}`
        : `cursor=${encodeURIComponent(cursorOrPage || '')}`;
    const result = await apiRequest(SOCIAL_API, `/feed?${paging}&limit=10&mode=${mode}`, {
        token,
        signal,
    });
    if (!Array.isArray(result.data)) throw new Error('Unexpected feed response');
    return result;
}

export async function getPost(token, id, signal) {
    const result = await apiRequest(SOCIAL_API, `/posts/${id}`, { token, signal });
    if (result.data?.id !== id) throw new Error('Unexpected post response');
    if (result.data.status !== true) {
        const error = new Error('This post is no longer available.');
        error.status = 404;
        throw error;
    }
    return result.data;
}

export function recordPostInsight(token, id, eventType, source = 'feed') {
    const eventKey = eventType === 'view'
        ? `view_${Math.floor(Date.now() / (30 * 60 * 1000))}`
        : globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    return apiRequest(SOCIAL_API, `/posts/${id}/insights/events`, {
        token,
        method: 'POST',
        body: { event_type: eventType, source, event_key: eventKey },
    });
}

export function recordPostImpressionOnce(token, id) {
    const key = `${token}:${id}`;
    const now = Date.now();
    if (recentInsightViews.get(key) && now - recentInsightViews.get(key) < 30 * 60 * 1000) return Promise.resolve(null);
    recentInsightViews.set(key, now);
    return recordPostInsight(token, id, 'view').catch((error) => {
        recentInsightViews.delete(key);
        throw error;
    });
}
