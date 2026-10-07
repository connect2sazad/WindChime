export async function getPosts(token, signal) {
    const response = await fetch(
        'http://localhost:3102/api/v1/posts?page=1&limit=10&status=true',
        {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        }
    );

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(
            response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : body.message || 'Unable to load posts'
        );
    }

    if (!Array.isArray(body.data)) {
        throw new Error('Unexpected posts response');
    }

    return body;
}

export async function createPost(token, content) {
    const response = await fetch('http://localhost:3102/api/v1/posts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
        signal: AbortSignal.timeout(10000),
    });

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(
            response.status === 401
                ? 'Your session has expired. Please sign in again.'
                : body.message || 'Unable to publish your post'
        );
    }

    if (!Number.isInteger(body.data?.id)) {
        throw new Error('Unexpected post response');
    }

    return body.data;
}