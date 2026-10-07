import { apiRequest, SOCIAL_API } from './request.js';
export async function getMyReaction(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions/me`, { token, signal });
    return body.data.reaction;
}
export async function setReaction(token, postId, type) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions`, { token, method: 'PUT', body: { type } });
    return body.data;
}
export async function removeReaction(token, postId) {
    await apiRequest(SOCIAL_API, `/posts/${postId}/reactions`, { token, method: 'DELETE' });
}
export async function getReactionSummary(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions/summary`, { token, signal });
    const data = body.data;
    if (!Number.isInteger(data?.total) || !data.counts || !Object.hasOwn(data, 'my_reaction')) throw new Error('Unexpected reaction summary');
    return data;
}
