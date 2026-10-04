/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : schemas/registry.js
 *  Module        : Schema Validation
 *  Type          : Schema Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application schemas by importing and
 *  exposing reusable base, user, and authentication schemas through a
 *  single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import reusable base schemas
 *  - Import user-related schemas
 *  - Import authentication-related schemas
 *  - Provide a centralized export for application schemas
 *  - Simplify schema imports across the application
 *  - Maintain a single access point for registered schemas
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import * as Base from "./base.schema.js";
import * as Pagination from "./pagination.schema.js";
import * as Post from "./post.schema.js";
import * as Comment from "./comment.schema.js";
import * as ReactionSchemas from "./reactions.schema.js";


// export all the schemas
const Schemas = {
    Base,
    Pagination,
    Post,
    Comment,
    ReactionSchemas
};
export default Schemas;