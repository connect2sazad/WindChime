import { apiRequest, IDENTITY_API } from './request.js';
export async function login(username, password) {
    const body = await apiRequest(IDENTITY_API, '/auth/login', { method: 'POST', body: { username, password } });
    const { token, ...user } = body.data || {};
    if (!Number.isInteger(user.id) || typeof token?.token !== 'string' || !token.token) throw new Error('Unexpected login response');
    return { user, token: token.token };
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
