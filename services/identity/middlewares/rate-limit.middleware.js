/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/rate-limit.middleware.js
 *  Module        : Request Security
 *  Type          : Login Rate Limit Middleware
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines rate-limiting middleware for login requests to restrict excessive
 *  authentication attempts within a configured time window.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Limit repeated login requests within a defined time window
 *  - Load the permitted login attempt limit from application configuration
 *  - Reduce excessive authentication requests
 *  - Return a standardized response when the login limit is exceeded
 *  - Enable standard rate-limit response headers
 *  - Disable legacy rate-limit response headers
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { rateLimit } from "express-rate-limit";

import config from "../config/config.js";
import TooManyRequestsException from "../errors/TooManyRequestsException.js";

const LoginLimiter = rateLimit({

    windowMs: 15 * 60 * 1000,

    limit: config.LOGIN_LIMIT,

    standardHeaders: true,
    legacyHeaders: false,

    handler: (req, res, next) => next(new TooManyRequestsException('Too many login attempts. Please try again later!')),

});

export default LoginLimiter;