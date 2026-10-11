import { SOCIAL_API } from '../../../shared/config/services.js';
import { apiRequest } from '../../../shared/api/request.js';

export const sendReport = (token, body) => apiRequest(SOCIAL_API, '/reports', { token, method: 'POST', body });
