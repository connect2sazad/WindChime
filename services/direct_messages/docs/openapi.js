/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : docs/openapi.js
 *  Module        : API Documentation
 *  Type          : OpenAPI Core Configuration
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Initializes the application's OpenAPI documentation infrastructure by
 *  extending Zod with OpenAPI support, creating the shared documentation
 *  registry, and registering the JWT bearer authentication scheme.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Extend Zod with OpenAPI schema capabilities
 *  - Create the shared OpenAPI registry
 *  - Register the JWT bearer authentication security scheme
 *  - Export the OpenAPI-enabled Zod instance
 *  - Export the shared OpenAPI registry
 *  - Export the registered bearer authentication definition
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from "zod";
import {
    extendZodWithOpenApi,
    OpenAPIRegistry
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export { z };

export const registry = new OpenAPIRegistry();

export const bearerAuth = registry.registerComponent(
    "securitySchemes",
    "bearerAuth",
    {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
    }
);