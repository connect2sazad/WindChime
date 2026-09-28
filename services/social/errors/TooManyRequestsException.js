import AppException from './AppException.js';
import HTTP_STATUS from '../utils/status_codes.js';
export default class TooManyRequestsException extends AppException {
    constructor(message = 'Too many requests', custom = {}) { super(HTTP_STATUS.HTTP_429_TOO_MANY_REQUESTS, message, custom); this.name = 'TooManyRequestsException'; }
}
