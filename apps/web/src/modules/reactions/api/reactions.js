import { apiRequest, SOCIAL_API } from '../../../shared/api/request.js';
// Social-service requests for adding, removing, and summarizing post reactions.
export async function getMyReaction(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions/me`, { token, signal });
    return body.data.reaction;
}
export async function setReaction(token, postId, type) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions`, {
        token,
        method: 'PUT',
        body: { type },
    });
    return body.data;
}
export async function removeReaction(token, postId) {
    await apiRequest(SOCIAL_API, `/posts/${postId}/reactions`, { token, method: 'DELETE' });
}
export async function getReactionSummary(token, postId, signal) {
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions/summary`, {
        token,
        signal,
    });
    const data = body.data;
    if (!Number.isInteger(data?.total) || !data.counts || !Object.hasOwn(data, 'my_reaction'))
        throw new Error('Unexpected reaction summary');
    return data;
}

export async function getReactors(token, postId, type = null, page = 1, signal) {
    const query = new URLSearchParams({ page: String(page), limit: '20' });
    if (type) query.set('type', type);
    const body = await apiRequest(SOCIAL_API, `/posts/${postId}/reactions/people?${query}`, {
        token,
        signal,
    });
    if (!Array.isArray(body.data)) throw new Error('Unexpected reactor list');
    return body;
}
