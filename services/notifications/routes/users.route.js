/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : routes/users.route.js
 *  Module        : Routing
 *  Type          : Users Route
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines protected user resource routes and connects user-related API
 *  endpoints with their corresponding controller operations and authentication
 *  middleware.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define user resource route paths
 *  - Provide an endpoint for retrieving user collections
 *  - Provide an endpoint for retrieving individual users
 *  - Protect user endpoints using JWT authentication
 *  - Forward user requests to the user controller
 *  - Provide a centralized router for user resource endpoints
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

const USERS = "/users";
const USERS_ID = USERS + "/:id";
// const USERS_ID_REMOVE = USERS_ID + "/remove";

router.get(
    USERS,
    Middlewares.JWTTokenization.authenticate,
    async (req, res, next) => {
        await Controllers.user_controller.get(
            req,
            res,
            next
        );
    }
);


router.get(
    USERS_ID,
    Middlewares.JWTTokenization.authenticate,
    async (req, res, next) => {
        await Controllers.user_controller.get(
            req,
            res,
            next
        );
    }
);

export default router;