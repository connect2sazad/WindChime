import { NOTIFICATIONS_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';
export async function getUnreadNotificationCount(token, signal) {
    const result = await apiRequest(NOTIFICATIONS_API, '/notifications/unread-count', { token, signal });
    return result.data.count;
}

export const getNotifications = (token, signal) =>
    apiRequest(NOTIFICATIONS_API, '/notifications?page=1&limit=30', { token, signal });

export const markNotificationRead = (token, id) => apiRequest(
    NOTIFICATIONS_API, `/notifications/${id}/read`, { token, method: 'PATCH', body: {} },
);

export const markAllNotificationsRead = (token, throughId) => apiRequest(
    NOTIFICATIONS_API, '/notifications/read-all', { token, method: 'PATCH', body: { through_id: throughId } },
);
