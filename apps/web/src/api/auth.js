import { apiRequest, IDENTITY_API } from './request.js';

export async function login(username, password) {
    const body = await apiRequest(IDENTITY_API, '/auth/login', { method: 'POST', body: { username, password } });
    const { token, ...user } = body.data || {};
    if (!Number.isInteger(user.id) || typeof token?.token !== 'string' || !token.token) throw new Error('Unexpected login response');
    return { user, token: token.token };
}
export async function register(name, username, email, password, confirm_password) {
    const body = await apiRequest(IDENTITY_API, '/auth/register', {
        method: 'POST', body: { name, username, email, password, confirm_password },
    });
    if (!Number.isInteger(body.data?.id)) {
        const error = new Error('Account created, but the response was unexpected. Please sign in.');
        error.accountCreated = true;
        throw error;
    }
    try {
        return await login(username, password);
    } catch (error) {
        error.accountCreated = true;
        error.message = 'Your account was created, but automatic sign-in failed. ' + error.message;
        throw error;
    }
}
export async function getCurrentUser(token, signal) {
    const body = await apiRequest(IDENTITY_API, '/auth/me', { token, signal });
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected session response');
    return body.data;
}
export async function logout(token) {
    try { await apiRequest(IDENTITY_API, '/auth/logout', { token, method: 'PUT' }); }
    catch (error) { if (error.status !== 401) throw error; }
}
