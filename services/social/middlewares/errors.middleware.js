/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/errors.middleware.js
 *  Module        : Error Handling
 *  Type          : Global Error Middleware
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides centralized error handling for the application and converts
 *  application, request parsing, database, and unexpected errors into
 *  consistent API error responses.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Handle invalid JSON request bodies
 *  - Handle custom application exceptions
 *  - Handle Sequelize unique constraint errors
 *  - Handle Sequelize validation errors
 *  - Handle Sequelize foreign key constraint errors
 *  - Provide a fallback for unexpected internal server errors
 *  - Include request IDs for error correlation and tracing
 *  - Log application and unexpected errors
 *  - Return standardized JSON error responses
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError, ConnectionError, TimeoutError } from 'sequelize';
import { randomUUID } from 'node:crypto';
import AppException from '../errors/AppException.js';

const httpErrors = {
    400: ['BAD_REQUEST', 'Invalid request'], 403: ['FORBIDDEN', 'Access denied'],
    404: ['NOT_FOUND', 'Resource not found'], 405: ['METHOD_NOT_ALLOWED', 'Method not allowed'],
    413: ['PAYLOAD_TOO_LARGE', 'Request body is too large'],
    415: ['UNSUPPORTED_MEDIA_TYPE', 'Unsupported request media type or encoding'],
    429: ['TOO_MANY_REQUESTS', 'Too many requests']
};
export default function ErrorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);
    let status = 500, code = 'INTERNAL_SERVER_ERROR', message = 'An internal server error occurred.', details;
    if (error instanceof AppException) {
        status = error.statusCode; code = error.code;
        if (status < 500 || status === 503) message = error.message;
        if (status < 500 && Array.isArray(error.errors)) details = error.errors.map(({ field, message }) => ({ field, message }));
    } else if (error instanceof UniqueConstraintError) {
        status = 409; code = 'CONFLICT'; message = 'A record with the provided value already exists.';
        details = error.errors.map(item => ({ field: item.path, message: 'Value already exists' }));
    } else if (error instanceof ValidationError) {
        status = 422; code = 'UNPROCESSABLE_ENTITY'; message = 'Database validation failed.';
        details = error.errors.map(item => ({ field: item.path, message: 'Invalid value' }));
    } else if (error instanceof ForeignKeyConstraintError) {
        status = 409; code = 'FOREIGN_KEY_CONSTRAINT'; message = 'The related record does not exist or cannot be modified.';
    } else if (error instanceof ConnectionError || error instanceof TimeoutError) {
        status = 503; code = 'SERVICE_UNAVAILABLE'; message = 'Database temporarily unavailable.';
    } else if (error?.type === 'entity.parse.failed') {
        status = 400; code = 'INVALID_JSON'; message = 'Request body contains invalid JSON.';
    } else {
        const suppliedStatus = error?.statusCode ?? error?.status;
        if (Number.isInteger(suppliedStatus) && httpErrors[suppliedStatus]) {
            status = suppliedStatus; [code, message] = httpErrors[status];
        }
    }
    req.reqId ||= randomUUID();
    res.setHeader('X-Request-ID', req.reqId);
    if (status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
    if (status >= 500) console.error({ request_id: req.reqId, status_code: status, error_name: error?.name || 'Error',
        cause_name: error?.cause?.name,
        stack: (process.env.ENVIRONMENT === 'development' || process.env.NODE_ENV === 'development')
            ? String(error?.stack || '').split('\n').slice(1).join('\n') : undefined });
    return res.status(status).json({ success: false, code, message, request_id: req.reqId,
        timestamp: new Date().toISOString(), ...(details && { errors: details }) });
}
