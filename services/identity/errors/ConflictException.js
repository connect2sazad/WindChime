/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/ConflictException.js
 *  Module        : Error Handling
 *  Type          : Conflict Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines a specialized application exception for cases where request data
 *  fails application validation requirements.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Represent application validation errors
 *  - Extend the application's base AppException class
 *  - Associate validation failures with HTTP 422 Unprocessable Entity
 *  - Provide a default validation failure message
 *  - Support custom error messages and additional validation metadata
 *  - Identify validation errors with a dedicated exception name
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import utils from '../utils/registry.js';

class ConflictException extends AppException {
    constructor(message = 'Resource conflict', custom = {}) {
        super(
            utils.HTTP_STATUS.HTTP_409_CONFLICT,
            message,
            custom
        );

        this.name = 'ConflictException';
    }
}

export default ConflictException;