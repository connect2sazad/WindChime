import { SOCIAL_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

export function getPostReactors(token, postId, signal) {
    return apiRequest(SOCIAL_API, `/posts/${postId}/reactions/people?page=1&limit=50`, { token, signal });
}
