/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/registry.js
 *  Module        : Middleware
 *  Type          : Middleware Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application middleware by importing
 *  and exposing middleware components through a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import application middleware components
 *  - Provide a centralized middleware export
 *  - Simplify middleware imports across the application
 *  - Maintain a single access point for registered middleware
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import CorsPolicy from './cors.middleware.js';
import ErrorHandler from './errors.middleware.js';
import ReqIdPolicy from './reqid.middleware.js';
import JWTTokenization from './jwt-tokenization.middleware.js';
import LoginLimiter from './rate-limit.middleware.js';

const Middlewares = {
    ErrorHandler,
    CorsPolicy,
    ReqIdPolicy,
    JWTTokenization,
    LoginLimiter,
};

export default Middlewares;