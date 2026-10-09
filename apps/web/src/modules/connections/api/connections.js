import { apiRequest, SOCIAL_API, IDENTITY_API } from '../../../shared/api/request.js';
// Social-service requests for searches, connection lists, and relationship changes.
export async function listConnections(token, view, page = 1, signal, search = '') {
    return apiRequest(
        SOCIAL_API,
        `/connections?view=${view}&page=${page}${search ? '&search=' + encodeURIComponent(search) : ''}`,
        { token, signal },
    );
}
export async function listProfileConnections(token, id, view, page = 1, signal) {
    return apiRequest(SOCIAL_API, `/profiles/${id}/connections?view=${view}&page=${page}`, {
        token,
        signal,
    });
}
export async function findPeople(token, search = '', page = 1, signal) {
    return apiRequest(
        IDENTITY_API,
        `/users?status=true&limit=10&page=${page}&search=${encodeURIComponent(search)}`,
        { token, signal },
    );
}
export async function getRelationship(token, id, signal) {
    return (await apiRequest(SOCIAL_API, `/connections/${id}`, { token, signal })).data;
}
export async function sendFriendRequest(token, id) {
    return apiRequest(SOCIAL_API, '/friendships/requests', {
        token,
        method: 'POST',
        body: { recipient_id: id },
    });
}
export async function respondRequest(token, id, action) {
    return apiRequest(SOCIAL_API, `/friendships/${id}/${action}`, { token, method: 'PATCH' });
}
export async function followPerson(token, id, following) {
    return apiRequest(SOCIAL_API, `/follows/${id}`, {
        token,
        method: following ? 'DELETE' : 'PUT',
    });
}
