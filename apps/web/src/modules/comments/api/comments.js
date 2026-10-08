import { apiRequest, SOCIAL_API } from '../../../shared/api/request.js';
export async function getComments(token, postId, signal, parentId = null, page = 1) {
    const query = new URLSearchParams({ page: String(page), limit: '10' });
    if (parentId !== null) query.set('parent_id', String(parentId));
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/comments?${query}`, { token, signal });
    if (!Array.isArray(body.data) || !Number.isInteger(body.pagination?.total)) throw new Error('Unexpected comments response');
    return body;
}
export async function createComment(token, postId, content, parentId = null) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/comments`, {
        token, method: 'POST', body: { content, ...(parentId !== null ? { parent_id: parentId } : {}) },
    });
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected comment response');
    return body.data;
}
export async function deleteComment(token, postId, commentId) {
    try { await apiRequest(SOCIAL_API, `/posts/${postId}/comments/${commentId}`, { token, method: 'DELETE' }); }
    catch (error) { if (error.status !== 404) throw error; }
}

export async function getCommentSummary(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/comments/summary`, { token, signal });
    if (!Number.isInteger(body.data?.total) || !body.data.reply_counts) throw new Error('Unexpected comment summary');
    return body.data;
}
export async function getCommentReaction(token, postId, commentId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/comments/${commentId}/reactions/summary`, { token, signal });
    return body.data;
}
export async function reactToComment(token, postId, commentId, remove = false, type = 'like') {
    await apiRequest(SOCIAL_API, `/posts/${postId}/comments/${commentId}/reactions`, {
        token, method: remove ? 'DELETE' : 'PUT', ...(remove ? {} : { body: { type } }),
    });
}

export async function getCommentReactors(token, postId, commentId, type = null, page = 1, signal) {
    const query = new URLSearchParams({ page: String(page), limit: '20' });
    if (type) query.set('type', type);
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/comments/${commentId}/reactions/people?${query}`, { token, signal });
    if (!Array.isArray(body.data)) throw new Error('Unexpected comment reactor list');
    return body;
}
