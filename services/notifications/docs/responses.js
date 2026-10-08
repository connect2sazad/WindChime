/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : docs/responses.js
 *  Module        : API Documentation
 *  Type          : OpenAPI Response Schema Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines reusable OpenAPI response schemas and response helpers used to
 *  maintain consistent API response documentation across application endpoints.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the standard response metadata schema
 *  - Define the standard API error response schema
 *  - Generate reusable success response schemas
 *  - Provide a standard empty success response schema
 *  - Generate OpenAPI JSON response definitions
 *  - Generate standardized error response definitions
 *  - Provide shared response schemas and helpers to OpenAPI definitions
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from "./openapi.js";

const MetadataSchema = z.object({
    timestamp: z.string().datetime(),
}).openapi("ResponseMetadata");

const ErrorResponseSchema = z.object({
    success: z.literal(false),
    code: z.string(),
    message: z.string(),
    request_id: z.string().uuid(),
    timestamp: z.string().datetime(),
    errors: z.array(
        z.object({
            field: z.string().nullable().optional(),
            message: z.string(),
        })
    ).optional(),
}).openapi("ErrorResponse");

const createSuccessResponseSchema = (name, dataSchema, extras = {}) => {
    return z.object({
        success: z.literal(true),
        message: z.string(),
        data: dataSchema,
        ...extras,
        metadata: MetadataSchema,
    }).openapi(name);
};

const EmptyResponseSchema = createSuccessResponseSchema(
    "EmptyResponse",
    z.object({})
);

const jsonResponse = (description, schema) => ({
    description,
    content: {
        "application/json": {
            schema
        }
    },
});

const errorResponse = (description) =>
    jsonResponse(description, ErrorResponseSchema);

export default {
    errorResponse,
    EmptyResponseSchema,
    jsonResponse,
    createSuccessResponseSchema,
    ErrorResponseSchema,
    MetadataSchema
};