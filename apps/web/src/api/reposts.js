async function request(token, postId, method, signal) {
    const response = await fetch(
        `http://localhost:3102/api/v1/posts/${postId}/repost`,
        {
            method,
            headers: { Authorization: `Bearer ${token}` },
            signal,
        }
    );

    if (response.status === 204) return null;

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(body.message || 'Unable to process repost');
    }

    return body.data;
}

export const getRepostSummary = (token, postId, signal) =>
    request(token, postId, 'GET', signal);

export const addRepost = (token, postId) =>
    request(token, postId, 'PUT', AbortSignal.timeout(10000));

export const undoRepost = (token, postId) =>
    request(token, postId, 'DELETE', AbortSignal.timeout(10000));