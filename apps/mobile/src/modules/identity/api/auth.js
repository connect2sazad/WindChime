import { IDENTITY_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

function sessionFrom(data) {
    const { token, ...user } = data || {};
    if (!Number.isInteger(user.id) || typeof token?.token !== 'string' || !token.token) {
        throw new Error('The server returned an invalid sign-in response.');
    }
    return { user, token: token.token };
}

export async function login(username, password) {
    const result = await apiRequest(IDENTITY_API, '/auth/login', {
        method: 'POST',
        body: { username, password },
    });
    return sessionFrom(result.data);
}

export async function registerAccount(input) {
    const result = await apiRequest(IDENTITY_API, '/auth/register', {
        method: 'POST',
        body: input,
        timeoutMs: 30000,
    });
    if (typeof result.data?.verification_id !== 'string') {
        throw new Error('The server did not return an email verification request.');
    }
    return result.data;
}

export async function verifyRegistration(verificationId, code) {
    const result = await apiRequest(IDENTITY_API, '/auth/register/verify', {
        method: 'POST',
        body: { verification_id: verificationId, code },
    });
    return sessionFrom(result.data);
}

export async function resendRegistration(verificationId) {
    const result = await apiRequest(IDENTITY_API, '/auth/register/resend', {
        method: 'POST',
        body: { verification_id: verificationId },
        timeoutMs: 30000,
    });
    return result.data;
}

export async function getCurrentUser(token, signal) {
    const result = await apiRequest(IDENTITY_API, '/auth/me', { token, signal });
    if (!Number.isInteger(result.data?.id)) throw new Error('The server returned an invalid session.');
    return result.data;
}

export async function logout(token) {
    try {
        await apiRequest(IDENTITY_API, '/auth/logout', { token, method: 'PUT' });
    } catch (error) {
        if (error.status !== 401) throw error;
    }
}
