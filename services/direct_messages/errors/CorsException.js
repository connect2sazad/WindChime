/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/CorsException.js
 *  Module        : Error Handling
 *  Type          : CORS Policy Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines a specialized application exception for Cross-Origin Resource
 *  Sharing (CORS) policy violations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Represent CORS policy violations
 *  - Extend the application's base AppException class
 *  - Associate CORS violations with the HTTP 403 Forbidden status
 *  - Provide a default CORS policy violation message
 *  - Support custom error messages and additional metadata
 *  - Identify CORS errors with a dedicated exception name
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import utils from '../utils/registry.js';

class CorsException extends AppException {

    constructor(message = 'CORS policy violation', custom = {}) {

        super(
            utils.HTTP_STATUS.HTTP_403_FORBIDDEN,
            message,
            custom
        );

        this.name = 'CorsException';
    }
}

export default CorsException;