/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : schemas/auth.schema.js
 *  Module        : Schema Validation
 *  Type          : Authentication Schema
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines validation and OpenAPI-compatible schemas for authentication
 *  operations including login, user registration, and password reset.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define login request validation rules
 *  - Define user registration validation rules
 *  - Define password reset validation rules
 *  - Validate username and password input
 *  - Validate registration user information
 *  - Ensure password and confirmation password values match
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
import { PasswordSchema } from './password.schema.js';

export const LoginSchema = z.object({

    username: z.string().trim().min(3).max(50)
        .openapi({
            example: 'connect2sazad'
        }),

    password: PasswordSchema
        .openapi({
            example: "secretOrPasswordHere-123456"
        }),

});

export const RegisterUserSchema = z.object({

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

export const PasswordResetSchema = z.object({

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