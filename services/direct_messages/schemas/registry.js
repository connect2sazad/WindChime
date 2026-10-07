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

import * as Auth from "./auth.schema.js";
import * as Base from "./base.schema.js";
import * as Pagination from "./pagination.schema.js";
import * as Users from "./user.schema.js";


// export all the schemas
const Schemas = {
    Auth,
    Base,
    Pagination,
    Users
};
export default Schemas;