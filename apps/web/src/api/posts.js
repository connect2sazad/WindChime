import { apiRequest, SOCIAL_API } from './request.js';
export async function getPosts(token, signal) {
    const body = await apiRequest(SOCIAL_API, '/posts?page=1&limit=10&status=true', { token, signal });
    if (!Array.isArray(body.data)) throw new Error('Unexpected posts response');
    return body;
}
export async function createPost(token, content) {
    const body = await apiRequest(SOCIAL_API, '/posts', { token, method: 'POST', body: { content } });
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected post response');
    return body.data;
}
