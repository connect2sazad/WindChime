/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : schemas/user.schema.js
 *  Module        : Schema Validation
 *  Type          : User Schema
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines validation and OpenAPI-compatible schemas for user data,
 *  user creation, and user update operations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the standard user data schema
 *  - Define user creation validation rules
 *  - Define user update validation rules
 *  - Validate username, name, and email fields
 *  - Validate password confirmation during user creation
 *  - Support optional fields for partial user updates
 *  - Provide example values for OpenAPI documentation
 *  - Extend shared base schema fields where required
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { z } from '../docs/openapi.js';
import { BaseSchema } from './base.schema.js';
import { PasswordSchema } from './password.schema.js';

export const UserSchema = BaseSchema.extend({

    username: z.string()
        .openapi({
            example: 'connect2sazad'
        }),

    name: z.string()
        .openapi({
            example: "Sazad Ahemad"
        }),

    email: z.email().max(150)
        .openapi({
            example: "mail2sazad@gmail.com"
        }),

});

export const UserCreateSchema = z.object({

    username: z.string().trim().min(3).max(50)
        .openapi({
            example: 'connect2sazad'
        }),

    name: z.string().trim().min(3).max(100)
        .openapi({
            example: "Sazad Ahemad"
        }),

    email: z.email().max(150)
        .openapi({
            example: "mail2sazad@gmail.com"
        }),

    password: PasswordSchema
        .openapi({
            example: "secretOrPasswordHere-123456"
        }),

    confirm_password: PasswordSchema
        .openapi({
            example: "confirmSecretOrPasswordHere-123456"
        }),

}).refine(
    (data) => data.password === data.confirm_password,
    {
        message: "Password and Confirm Password do not match!",
        path: ['confirm_password']
    }
);

export const UserUpdateSchema = z.object({

    username: z.string().trim().min(3).max(50).optional()
        .openapi({
            example: 'connect2sazad'
        }),

    name: z.string().trim().min(3).max(100).optional()
        .openapi({
            example: "Sazad Ahemad"
        }),

    email: z.email().max(150).optional()
        .openapi({
            example: "mail2sazad@gmail.com"
        }),

}).refine(data => Object.keys(data).length > 0, 'Provide at least one field to update');