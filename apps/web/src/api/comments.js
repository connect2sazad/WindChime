import { apiRequest, SOCIAL_API } from './request.js';
export async function getComments(token, postId, signal, parentId = null) {
    const query = new URLSearchParams({ page: '1', limit: '10' });
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
