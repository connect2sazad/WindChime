import { apiRequest, IDENTITY_API } from '../../../shared/api/request.js';

// Identity-service requests for sign-in, registration, verification, and current-user data.
export async function login(username, password) {
    const body = await apiRequest(IDENTITY_API, '/auth/login', {
        method: 'POST',
        body: { username, password },
    });
    const { token, ...user } = body.data || {};
    if (!Number.isInteger(user.id) || typeof token?.token !== 'string' || !token.token)
        throw new Error('Unexpected login response');
    return { user, token: token.token };
}
export async function register(name, username, email, password, confirm_password) {
    const result = await apiRequest(IDENTITY_API, '/auth/register', {
        method: 'POST',
        body: { name, username, email, password, confirm_password },
        timeoutMs: 30000,
    });
    if (typeof result.data?.verification_id !== 'string')
        throw new Error('Unexpected verification response');
    return result.data;
}
export async function verifyRegistration(verification_id, code) {
    const result = await apiRequest(IDENTITY_API, '/auth/register/verify', {
        method: 'POST',
        body: { verification_id, code },
    });
    const { token, ...user } = result.data || {};
    if (!Number.isInteger(user.id) || typeof token?.token !== 'string')
        throw new Error('Unexpected verified session');
    return { user, token: token.token };
}
export async function resendRegistration(verification_id) {
    const result = await apiRequest(IDENTITY_API, '/auth/register/resend', {
        method: 'POST',
        body: { verification_id },
        timeoutMs: 30000,
    });
    return result.data;
}
export async function checkAvailability(field, value, token, signal) {
    const result = await apiRequest(
        IDENTITY_API,
        token ? '/users/me/availability' : '/auth/availability',
        { token, signal, method: 'POST', body: { field, value } },
    );
    return result.data;
}
export async function getCurrentUser(token, signal) {
    const body = await apiRequest(IDENTITY_API, '/auth/me', { token, signal });
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected session response');
    return body.data;
}
export async function logout(token) {
    try {
        await apiRequest(IDENTITY_API, '/auth/logout', { token, method: 'PUT' });
    } catch (error) {
        if (error.status !== 401) throw error;
    }
}
