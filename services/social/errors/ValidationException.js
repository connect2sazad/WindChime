/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/ValidationException.js
 *  Module        : Error Handling
 *  Type          : Validation Exception
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

class ValidationException extends AppException {

    constructor(message = 'Validation Failed', custom = {}) {

        super(
            utils.HTTP_STATUS.HTTP_422_UNPROCESSABLE_ENTITY,
            message,
            custom
        );

        this.name = 'ValidationException';
    }
}

export default ValidationException;