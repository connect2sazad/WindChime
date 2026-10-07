async function request(token, postId, method, type, signal) {
    const suffix = method === 'GET' ? '/me' : '';
    const response = await fetch(
        `http://localhost:3102/api/v1/posts/${postId}/reactions${suffix}`,
        {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(type ? { 'Content-Type': 'application/json' } : {}),
            },
            ...(type ? { body: JSON.stringify({ type }) } : {}),
            signal,
        }
    );

    if (response.status === 204) return null;

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(body.message || 'Unable to update reaction');
    }

    return method === 'GET' ? body.data.reaction : body.data;
}

export const getMyReaction = (token, postId, signal) =>
    request(token, postId, 'GET', undefined, signal);

export const setReaction = (token, postId, type) =>
    request(token, postId, 'PUT', type, AbortSignal.timeout(10000));

export const removeReaction = (token, postId) =>
    request(token, postId, 'DELETE', undefined, AbortSignal.timeout(10000));

export async function getReactionSummary(token, postId, signal) {
    const response = await fetch(
        `http://localhost:3102/api/v1/posts/${postId}/reactions/summary`,
        {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        }
    );

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(body.message || 'Unable to load reactions');
    }

    return body.data;
}