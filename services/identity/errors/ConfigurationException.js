/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/ConfigurationException.js
 *  Module        : Error Handling
 *  Type          : Application Configuration Exception
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines a specialized application exception for configuration-related
 *  errors, such as missing, invalid, or unavailable configuration values.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Represent application configuration errors
 *  - Extend the application's base AppException class
 *  - Associate configuration failures with an internal server error status
 *  - Provide a default configuration error message
 *  - Support custom error messages and additional metadata
 *  - Identify configuration errors with a dedicated exception name
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import HTTP_STATUS from '../utils/status_codes.js';

class ConfigurationException extends AppException {

    constructor(message = 'Application configuration error', custom = {}) {

        super(
            HTTP_STATUS.HTTP_500_INTERNAL_SERVER_ERROR,
            message,
            custom
        );

        this.name = 'ConfigurationException';
    }
}

export default ConfigurationException;