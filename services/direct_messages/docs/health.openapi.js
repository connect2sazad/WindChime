/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : docs/health.openapi.js
 *  Module        : API Documentation
 *  Type          : Health OpenAPI Definition
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the OpenAPI documentation and response schemas for the application's
 *  health check and database readiness endpoints.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the health check response schema
 *  - Define successful database readiness response schema
 *  - Define unavailable database readiness response schema
 *  - Register the GET /health endpoint with the OpenAPI registry
 *  - Register the GET /health/ready endpoint with the OpenAPI registry
 *  - Document HTTP 200 and 503 responses for health operations
 *  - Mark health and readiness endpoints as publicly accessible
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from './openapi.js';
import schemas from "./responses.js";
import { registry as openapi_reg } from './openapi.js';

const Healthschemaschema = schemas.createSuccessResponseSchema(
    "HealthResponse",
    z.object({
        healthy: z.literal(true),
        project_title: z.string(),
        api_version: z.string(),
        check_readiness: z.literal("/health/ready"),
    })
);

const readinessData = (ready, database) => z.object({
    ready: z.literal(ready),
    database: z.literal(database),
    project_title: z.string(),
    api_version: z.string(),
});

const Readyschemaschema = schemas.createSuccessResponseSchema(
    "ReadyResponse",
    readinessData(true, "connected")
);

const NotReadyschemaschema = z.object({
    success: z.literal(false),
    message: z.string(),
    data: readinessData(false, "disconnected"),
    metadata: schemas.MetadataSchema,
}).openapi("NotReadyResponse");

openapi_reg.registerPath({
    method: "get",
    path: "/health",
    tags: ["Health"],
    summary: "Health check",
    security: [],
    responses: {
        200: schemas.jsonResponse(
            "Application is running",
            Healthschemaschema
        )
    },
});

openapi_reg.registerPath({
    method: "get",
    path: "/health/ready",
    tags: ["Health"],
    summary: "Database readiness check",
    security: [],
    responses: {
        200: schemas.jsonResponse(
            "Database is connected",
            Readyschemaschema
        ),
        503: schemas.jsonResponse(
            "Database is unavailable",
            schemas.ErrorResponseSchema
        ),
    },
});

export default "docs";