import AppException from './AppException.js';
import HTTP_STATUS from '../utils/status_codes.js';
export default class ServiceUnavailableException extends AppException {
    constructor(message = 'Service temporarily unavailable', custom = {}) { super(HTTP_STATUS.HTTP_503_SERVICE_UNAVAILABLE, message, custom); this.name = 'ServiceUnavailableException'; }
}
