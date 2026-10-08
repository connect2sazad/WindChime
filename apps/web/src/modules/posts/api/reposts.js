import { apiRequest, SOCIAL_API } from '../../../shared/api/request.js';
export async function getRepostSummary(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/repost`, { token, signal });
    if (!Number.isInteger(body.data?.total) || typeof body.data.reposted !== 'boolean') throw new Error('Unexpected repost summary');
    return body.data;
}
export async function addRepost(token, postId) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/repost`, { token, method: 'PUT' });
    return body.data;
}
export async function undoRepost(token, postId) {
    await apiRequest(SOCIAL_API, `/posts/${postId}/repost`, { token, method: 'DELETE' });
}
