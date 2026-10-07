import { apiRequest, IDENTITY_API } from './request.js';

export async function getDisplayUser(token, id, signal) {
    try {
        const result = await apiRequest(IDENTITY_API, `/users/${id}/profile`, { token, signal });
        if (result.data?.id !== id || typeof result.data.name !== 'string') throw new Error('Unexpected account response');
        if (result.data.status === false) return { id, name: 'Unavailable account', username: null };
        return { id, name: result.data.name, username: result.data.username };
    } catch (error) {
        if (error.status === 404) return { id, name: 'Unavailable account', username: null };
        throw error;
    }
}

export async function getProfile(token, id, signal) { const result = await apiRequest(IDENTITY_API, `/users/${id}/profile`, { token, signal }); return result.data; }
export async function updateProfile(token, input) { const result = await apiRequest(IDENTITY_API, '/users/me/profile', { token, method: 'PATCH', body: input }); return result.data; }
export async function uploadProfilePicture(token, file) { const body = new FormData(); body.append('picture', file); return (await apiRequest(IDENTITY_API, '/users/me/picture', { token, method: 'PUT', body, timeoutMs: 30000 })).data; }
export async function removeProfilePicture(token) { return (await apiRequest(IDENTITY_API, '/users/me/picture', { token, method: 'DELETE' })).data; }
export async function getProfilePicture(token, id, signal) { return apiRequest(IDENTITY_API, `/users/${id}/picture`, { token, signal, responseType: 'blob' }); }

export async function getProfileByUsername(token, username, signal) {
    const result = await apiRequest(
        IDENTITY_API,
        `/profiles/${encodeURIComponent(username)}`,
        { token, signal }
    );

    return result.data;
}