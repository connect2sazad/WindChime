import AppException from './AppException.js';
import HTTP_STATUS from '../utils/status_codes.js';
export default class ForbiddenException extends AppException {
    constructor(message = 'Access denied', custom = {}) { super(HTTP_STATUS.HTTP_403_FORBIDDEN, message, custom); this.name = 'ForbiddenException'; }
}
