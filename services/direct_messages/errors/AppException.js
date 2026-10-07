/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/AppException.js
 *  Module        : Error Handling
 *  Type          : Application Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the application's custom exception class used to create
 *  standardized errors with HTTP status information and custom metadata.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Extend the native JavaScript Error class
 *  - Create standardized application exceptions
 *  - Associate exceptions with HTTP status codes
 *  - Provide application-specific error codes and messages
 *  - Attach timestamps to generated exceptions
 *  - Support additional custom error metadata
 *  - Preserve the exception stack trace for debugging
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import HTTP_STATUS from '../utils/status_codes.js';

export default class AppException extends Error {

    constructor(status = HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR, message = null, custom = {}) {
        if (!status || !Number.isInteger(status.status_code) || status.status_code < 400 || status.status_code > 599) {
            status = HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR;
        }
        super(message || status.message);
        this.name = 'AppException';
        this.statusCode = status.status_code;
        this.code = status.code;
        this.timestamp = new Date().toISOString();

        if (custom && typeof custom === 'object' && !Array.isArray(custom) && Object.keys(custom).length > 0) {
            for (const [key, value] of Object.entries(custom)) {
                if (!['name','statusCode','code','message','timestamp','stack','__proto__','constructor','prototype'].includes(key)) this[key] = value;
            }
        }

        Error.captureStackTrace?.(this, this.constructor);
    }
}