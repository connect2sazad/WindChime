/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : schemas/base.schema.js
 *  Module        : Schema Validation
 *  Type          : Base Schema Definition
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines reusable validation and OpenAPI-compatible schemas that provide
 *  shared application fields and common query parameter transformations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the shared identifier field
 *  - Define the shared status field
 *  - Define shared creation and update timestamp fields
 *  - Validate common field data types
 *  - Provide OpenAPI metadata and examples for shared fields
 *  - Normalize boolean values received through query parameters
 *  - Support true, false, 1, and 0 boolean query representations
 *  - Treat empty or missing boolean query values as undefined
 *  - Provide reusable schemas for application validation
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from '../docs/openapi.js';

export const BaseSchema = z.object({

    id: z.number().int()
        .openapi({
            example: 1
        }),

    status: z.boolean()
        .openapi({
            example: true
        }),

    created_at: z.coerce.date()
        .openapi({
            type: 'string',
            format: 'date-time',
            example: '2026-09-09T07:46:00.000Z',
        }),

    updated_at: z.coerce.date()
        .openapi({
            type: 'string',
            format: 'date-time',
            example: '2026-09-09T07:46:00.000Z',
        }),

});

export const BooleanQuerySchema = z.preprocess(
    (value) => {

        if (value === undefined || value === null || value === "") {
            return undefined;
        }

        if (value === true || value === "true" || value === "1") {
            return true;
        }

        if (value === false || value === "false" || value === "0") {
            return false;
        }

        return value;

    },

    z.boolean().optional()
);

export const ParamsIdSchema = z.object({

    id: z.coerce.number().int().positive(),

});