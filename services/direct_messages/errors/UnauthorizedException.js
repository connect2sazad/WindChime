/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/UnauthorizedException.js
 *  Module        : Error Handling
 *  Type          : Unauthorized Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines a specialized application exception for cases where a request
 *  cannot be authenticated or valid authentication credentials are missing,
 *  invalid, or otherwise unacceptable.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Represent authentication-related authorization failures
 *  - Extend the application's base AppException class
 *  - Associate authentication failures with HTTP 401 Unauthorized
 *  - Provide a default unauthorized error message
 *  - Support custom error messages and additional metadata
 *  - Identify unauthorized errors with a dedicated exception name
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import utils from '../utils/registry.js';

class UnauthorizedException extends AppException {

    constructor(message = 'Unauthorized', custom = {}) {

        super(
            utils.HTTP_STATUS.HTTP_401_UNAUTHORIZED,
            message,
            custom
        );

        this.name = 'UnauthorizedException';
    }
}

export default UnauthorizedException;