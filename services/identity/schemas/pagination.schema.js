/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : schemas/pagination.schema.js
 *  Module        : Schema Validation
 *  Type          : Pagination Schema
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines validation and OpenAPI-compatible schemas for pagination,
 *  searching, filtering, and pagination metadata returned by API responses.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define pagination query parameter validation
 *  - Validate and normalize page and limit values
 *  - Provide default pagination values
 *  - Limit the maximum number of records per page
 *  - Support optional text-based search parameters
 *  - Support optional boolean status filtering
 *  - Define pagination metadata returned by API responses
 *  - Provide OpenAPI documentation for pagination parameters
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from '../docs/openapi.js';
import { BooleanQuerySchema } from './base.schema.js';

export const PaginationSchema = z.object({

    page: z.coerce.number().int().min(1).default(1)
        .openapi({
            example: 1,
            description: "Current page number",
        }),

    limit: z.coerce.number().int().min(1).max(100).default(10)
        .openapi({
            example: 10,
            description: "Number of records per page",
        }),

    search: z.string().trim().optional()
        .openapi({
            example: "swagger",
            description: "Search records by text",
        }),

    status: BooleanQuerySchema
        .openapi({
            example: true,
            description: "Filter records by status",
        }),

}).openapi("PaginationSchema");


export const PaginationResponseSchema = z.object({

    page: z.number().int().min(1),

    limit: z.number().int().min(1).max(100),

    total: z.number().int().min(0),

    total_pages: z.number().int().min(0),

    has_next_page: z.boolean(),

    has_previous_page: z.boolean(),

}).openapi("Pagination");