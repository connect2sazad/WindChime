import { apiRequest, IDENTITY_API } from './request.js';
export async function getDisplayUser(token, id, signal) {
    try {
        const result = await apiRequest(IDENTITY_API, `/users/${id}`, { token, signal });
        if (result.data?.id !== id || typeof result.data.name !== 'string') throw new Error('Unexpected account response');
        if (result.data.status === false) return { id, name: 'Unavailable account', username: null };
        return { id, name: result.data.name, username: result.data.username };
    } catch (error) {
        if (error.status === 404) return { id, name: 'Unavailable account', username: null };
        throw error;
    }
}
