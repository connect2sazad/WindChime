/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/NotFoundException.js
 *  Module        : Error Handling
 *  Type          : Resource Not Found Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines a specialized application exception for cases where a requested
 *  resource cannot be found.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Represent resource-not-found errors
 *  - Extend the application's base AppException class
 *  - Associate missing resources with the HTTP 404 Not Found status
 *  - Provide a default resource-not-found error message
 *  - Support custom error messages and additional metadata
 *  - Identify not-found errors with a dedicated exception name
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import utils from '../utils/registry.js';

class NotFoundException extends AppException {

    constructor(message = 'Requested Resource Not Found', custom = {}) {

        super(
            utils.HTTP_STATUS.HTTP_404_NOT_FOUND,
            message,
            custom
        );

        this.name = 'NotFoundException';
    }
}

export default NotFoundException;