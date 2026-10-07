/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : errors/registry.js
 *  Module        : Error Handling
 *  Type          : Error Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application error-handling components
 *  by importing and exposing exceptions and HTTP status definitions through
 *  a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import application exception classes
 *  - Import centralized HTTP status definitions
 *  - Provide a centralized export for error-handling components
 *  - Simplify error-related imports across the application
 *  - Maintain a single access point for registered exceptions and statuses
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AppException from './AppException.js';
import ConfigurationException from './ConfigurationException.js';
import ConflictException from './ConflictException.js';
import CorsException from './CorsException.js';
import NotFoundException from './NotFoundException.js';
import UnauthorizedException from './UnauthorizedException.js';
import ValidationException from './ValidationException.js';

import ForbiddenException from './ForbiddenException.js';

import ServiceUnavailableException from './ServiceUnavailableException.js';

import TooManyRequestsException from './TooManyRequestsException.js';

export default {
    TooManyRequestsException,
    ServiceUnavailableException,
    ForbiddenException,
    AppException,
    ConfigurationException,
    CorsException,
    NotFoundException,
    ValidationException,
    ConflictException,
    UnauthorizedException,
};