export async function login(username, password) {
    const response = await fetch(
        'http://localhost:3101/api/v1/auth/login',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
            signal: AbortSignal.timeout(10000),
        }
    );

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        throw new Error(body.message || 'Sign-in failed');
    }

    const { token, ...user } = body.data;

    if (typeof token?.token !== 'string' || !token.token) {
        throw new Error('Unexpected login response');
    }

    return { user, token: token.token };
}

export async function getCurrentUser(token, signal) {
    const response = await fetch(
        'http://localhost:3101/api/v1/auth/me',
        {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        }
    );

    const body = await response.json();

    if (!response.ok || body.success !== true) {
        const error = new Error(body.message || 'Unable to verify session');
        error.status = response.status;
        throw error;
    }

    if (!Number.isInteger(body.data?.id)) {
        throw new Error('Unexpected session response');
    }

    return body.data;
}

export async function logout(token) {
    const response = await fetch(
        'http://localhost:3101/api/v1/auth/logout',
        {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(10000),
        }
    );

    if (response.ok || response.status === 401) return;

    const body = await response.json();
    throw new Error(body.message || 'Unable to sign out');
}