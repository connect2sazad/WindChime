import { SOCIAL_API, IDENTITY_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

export const getConnections = (token, view = 'incoming', search = '', signal) => {
    const query = new URLSearchParams({ view, page: '1', limit: '30', search });
    return apiRequest(SOCIAL_API, `/connections?${query}`, { token, signal });
};

export const getUsers = (token, search, signal) => {
    const query = new URLSearchParams({ page: '1', limit: '20', search });
    return apiRequest(IDENTITY_API, `/users?${query}`, { token, signal });
};

export const getRelationship = (token, userId, signal) =>
    apiRequest(SOCIAL_API, `/connections/${userId}`, { token, signal });

export const sendFriendRequest = (token, userId) => apiRequest(SOCIAL_API, '/friendships/requests', {
    token, method: 'POST', body: { recipient_id: userId },
});

export const respondFriendRequest = (token, friendshipId, action) => apiRequest(
    SOCIAL_API,
    `/friendships/${friendshipId}/${action}`,
    { token, method: 'PATCH', body: {} },
);

export const unfriend = (token, friendshipId) => apiRequest(
    SOCIAL_API, `/friendships/${friendshipId}`, { token, method: 'DELETE' },
);

export const followUser = (token, userId) => apiRequest(
    SOCIAL_API, `/follows/${userId}`, { token, method: 'PUT', body: {} },
);

export const unfollowUser = (token, userId) => apiRequest(
    SOCIAL_API, `/follows/${userId}`, { token, method: 'DELETE' },
);

export const removeFollower = (token, userId) => apiRequest(
    SOCIAL_API, `/followers/${userId}`, { token, method: 'DELETE' },
);
