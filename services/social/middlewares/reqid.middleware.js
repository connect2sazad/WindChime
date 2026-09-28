/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/reqid.middleware.js
 *  Module        : Request Tracing
 *  Type          : Request ID Middleware
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Generates a unique identifier for every incoming request to support
 *  request tracing, debugging, logging, and response correlation.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Generate a unique UUID for each incoming request
 *  - Attach the generated request ID to the request object
 *  - Expose the request ID through the X-Request-ID response header
 *  - Provide a correlation identifier for logging and error tracking
 *  - Forward the request to the next middleware
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import crypto from 'crypto';

const ReqIdPolicy = (req, res, next) => {

    const reqId = crypto.randomUUID();

    req.reqId = reqId;
    res.setHeader('X-Request-ID', reqId);

    next();
};

export default ReqIdPolicy;