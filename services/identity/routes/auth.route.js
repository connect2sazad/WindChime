import Registration from '../controllers/registration.controller.js';
import { rateLimit } from 'express-rate-limit';
import errors from '../errors/registry.js';
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
import Schemas from "../schemas/registry.js";
import utils from "../utils/registry.js";

const router = express.Router();
const limit=(count)=>rateLimit({windowMs:15*60*1000,limit:count,standardHeaders:true,legacyHeaders:false,
 handler:(req,res,next)=>next(new errors.TooManyRequestsException('Too many attempts. Please try later'))});
router.post('/auth/availability',limit(120),(req,res,next)=>Registration.availability(req,res,next));
router.post('/auth/register/verify',limit(30),(req,res,next)=>Registration.verify(req,res,next));
router.post('/auth/register/resend',limit(10),(req,res,next)=>Registration.resend(req,res,next));

const AUTH = "/auth";
const AUTH_LOGIN = AUTH + "/login";
const AUTH_REGISTER = AUTH + "/register";
const AUTH_ME = AUTH + "/me";
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
    limit(10),
    async (req, res, next) => {
        await Registration.begin(
            req,
            res,
            next
        );
    }
);

router.get(
    AUTH_ME,
    Middlewares.JWTTokenization.authenticate,
    async (req, res, next) => {
        await Controllers.auth_controller.self(
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