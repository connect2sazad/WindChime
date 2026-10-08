/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : docs/registry.js
 *  Module        : API Documentation
 *  Type          : OpenAPI Documentation Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for OpenAPI documentation components by
 *  aggregating schemas, security definitions, utilities, and API definitions
 *  through a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Expose the configured Zod instance for OpenAPI schema definitions
 *  - Expose the central OpenAPI registry
 *  - Expose bearer authentication security definitions
 *  - Expose reusable API response schemas and helpers
 *  - Import and expose health API documentation definitions
 *  - Provide a centralized access point for OpenAPI documentation components
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import {
    z,
    registry as openapi_reg,
    bearerAuth
} from './openapi.js';

import schemas from './responses.js';
import health from './health.openapi.js';
import './auth.openapi.js';
import './users.openapi.js';

export {z};

export default {
    z,
    openapi_reg,
    bearerAuth,
    schemas,
    health,
};