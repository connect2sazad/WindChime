/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : config/swagger.js
 *  Module        : API Documentation
 *  Type          : OpenAPI Specification Generator
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Generates the OpenAPI specification used to document the application's
 *  API endpoints, schemas, responses, and related API metadata.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Load OpenAPI definitions registered by application modules
 *  - Generate the OpenAPI 3.0 specification
 *  - Configure API documentation metadata
 *  - Define the current API server
 *  - Provide the generated specification to Swagger UI
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import docs from "../docs/registry.js";
import config from "./config.js";

const generator = new OpenApiGeneratorV3(docs.openapi_reg.definitions);
const swaggerSpec = generator.generateDocument({
    openapi: "3.0.3",
    info: {
        title: config.PROJECT_TITLE,
        version: config.API_VERSION,
        description: config.PROJECT_NAME + " API Documentation",
    },
    servers: [{ url: "/", description: "Current server" }],
});

export default swaggerSpec;