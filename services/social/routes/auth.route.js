/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : routes/auth.route.js
 *  Module        : Routing
 *  Type          : Authentication Route
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines authentication routes for user login, registration, and logout,
 *  connecting authentication endpoints with their corresponding controller
 *  operations and request-specific middleware.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define authentication route paths
 *  - Provide the user login endpoint
 *  - Provide the user registration endpoint
 *  - Provide the authenticated user logout endpoint
 *  - Apply rate limiting to login attempts
 *  - Protect logout using JWT authentication
 *  - Forward authentication requests to the authentication controller
 *  - Provide a centralized router for authentication endpoints
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import express from "express";

import Middlewares from "../middlewares/registry.js";
import Controllers from "../controllers/registry.js";

const router = express.Router();

const AUTH = "/auth";
const AUTH_LOGIN = AUTH + "/login";
const AUTH_REGISTER = AUTH + "/register";
const AUTH_LOGOUT = AUTH + "/logout";

router.post(
    AUTH_LOGIN,
    Middlewares.LoginLimiter,
    async (req, res, next) => {
        await Controllers.auth_controller.login(
            req,
            res,
            next
        );
    }
);

router.post(
    AUTH_REGISTER,
    async (req, res, next) => {
        await Controllers.auth_controller.register(
            req,
            res,
            next
        );
    }
);

router.put(
    AUTH_LOGOUT,
    Middlewares.JWTTokenization.authenticate,
    async (req, res, next) => {
        await Controllers.auth_controller.logout(
            req,
            res,
            next
        );
    }
);

export default router;