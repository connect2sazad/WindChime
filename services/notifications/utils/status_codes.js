/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : utils/status_codes.js
 *  Module        : Application Utilities
 *  Type          : HTTP Status Definitions
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides centralized HTTP status definitions used throughout the
 *  application for consistent status codes, response codes, and messages.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define supported HTTP status codes
 *  - Provide application-friendly response codes for each HTTP status
 *  - Provide default messages for HTTP responses and errors
 *  - Group status definitions by HTTP response category
 *  - Maintain consistent HTTP status usage across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

const HTTP_STATUS = {
    // =========================
    // 2xx - SUCCESS
    // =========================

    HTTP_200_OK: {
        status_code: 200,
        code: 'OK',
        message: 'Request successful'
    },

    HTTP_201_CREATED: {
        status_code: 201,
        code: 'CREATED',
        message: 'Resource created successfully'
    },

    HTTP_202_ACCEPTED: {
        status_code: 202,
        code: 'ACCEPTED',
        message: 'Request accepted for processing'
    },

    HTTP_204_NO_CONTENT: {
        status_code: 204,
        code: 'NO_CONTENT',
        message: 'Request successful with no content'
    },


    // =========================
    // 4xx - CLIENT ERRORS
    // =========================

    HTTP_400_BAD_REQUEST: {
        status_code: 400,
        code: 'BAD_REQUEST',
        message: 'The request is invalid'
    },

    HTTP_401_UNAUTHORIZED: {
        status_code: 401,
        code: 'UNAUTHORIZED',
        message: 'Authentication is required'
    },

    HTTP_403_FORBIDDEN: {
        status_code: 403,
        code: 'FORBIDDEN',
        message: 'You do not have permission to access this resource'
    },

    HTTP_404_NOT_FOUND: {
        status_code: 404,
        code: 'NOT_FOUND',
        message: 'Resource not found'
    },

    HTTP_405_METHOD_NOT_ALLOWED: {
        status_code: 405,
        code: 'METHOD_NOT_ALLOWED',
        message: 'HTTP method is not allowed'
    },

    HTTP_406_NOT_ACCEPTABLE: {
        status_code: 406,
        code: 'NOT_ACCEPTABLE',
        message: 'The requested representation is not acceptable'
    },

    HTTP_408_REQUEST_TIMEOUT: {
        status_code: 408,
        code: 'REQUEST_TIMEOUT',
        message: 'The request timed out'
    },

    HTTP_409_CONFLICT: {
        status_code: 409,
        code: 'CONFLICT',
        message: 'The request conflicts with the current state of the resource'
    },

    HTTP_410_GONE: {
        status_code: 410,
        code: 'GONE',
        message: 'The requested resource is no longer available'
    },

    HTTP_415_UNSUPPORTED_MEDIA_TYPE: {
        status_code: 415,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        message: 'The media type is not supported'
    },

    HTTP_422_UNPROCESSABLE_ENTITY: {
        status_code: 422,
        code: 'UNPROCESSABLE_ENTITY',
        message: 'The request contains invalid data'
    },

    HTTP_429_TOO_MANY_REQUESTS: {
        status_code: 429,
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many requests'
    },


    // =========================
    // 5xx - SERVER ERRORS
    // =========================

    HTTP_500_INTERNAL_SERVER_ERROR: {
        status_code: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred'
    },

    HTTP_501_NOT_IMPLEMENTED: {
        status_code: 501,
        code: 'NOT_IMPLEMENTED',
        message: 'The requested functionality is not implemented'
    },

    HTTP_502_BAD_GATEWAY: {
        status_code: 502,
        code: 'BAD_GATEWAY',
        message: 'Invalid response from an upstream server'
    },

    HTTP_503_SERVICE_UNAVAILABLE: {
        status_code: 503,
        code: 'SERVICE_UNAVAILABLE',
        message: 'The service is temporarily unavailable'
    },

    HTTP_504_GATEWAY_TIMEOUT: {
        status_code: 504,
        code: 'GATEWAY_TIMEOUT',
        message: 'The upstream server timed out'
    }
};

export default HTTP_STATUS;