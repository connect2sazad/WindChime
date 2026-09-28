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

import {
    LoginSchema,
    RegisterUserSchema,
    PasswordResetSchema
} from "./auth.schema.js";
import { 
    BaseSchema,
    BooleanQuerySchema,
    ParamsIdSchema
} from "./base.schema.js";
import {
    PaginationResponseSchema,
    PaginationSchema
} from "./pagination.schema.js";
import {
    UserCreateSchema,
    UserSchema,
    UserUpdateSchema
} from "./user.schema.js";


// export all the schemas
const Schemas = {
    BaseSchema,
    BooleanQuerySchema,
    UserSchema,
    UserCreateSchema,
    UserUpdateSchema,
    RegisterUserSchema,
    LoginSchema,
    PasswordResetSchema,
    PaginationSchema,
    PaginationResponseSchema,
    ParamsIdSchema,
};
export default Schemas;