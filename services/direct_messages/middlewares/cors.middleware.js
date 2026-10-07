/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/cors.middleware.js
 *  Module        : Request Security
 *  Type          : CORS Policy Middleware
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines and enforces the application's Cross-Origin Resource Sharing
 *  (CORS) policy using the list of allowed origins from configuration.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Load allowed origins from the application configuration
 *  - Normalize the configured origin list
 *  - Allow requests from registered origins
 *  - Allow requests without an Origin header
 *  - Reject requests from unauthorized origins
 *  - Raise a CorsException when the CORS policy is violated
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import cors from 'cors';

import config from '../config/config.js';
import CorsException from '../errors/CorsException.js';

const allowedOrigins = config.ALLOWED_ORIGINS
    .split(',')
    .map((origin) => origin.trim());

const CorsPolicy = cors({
    origin: (origin, callback) => {

        // allow requests without header, eg: Postman
        if (!origin) {
            return callback(null, true);
        }

        // allow origins registered in environment
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // return exception for unauthorized cors
        return callback(new CorsException('Not allowed by CORS'))
    }
});

export default CorsPolicy;