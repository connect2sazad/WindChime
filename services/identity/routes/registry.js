/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : routes/registry.js
 *  Module        : Routing
 *  Type          : Route Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application route modules by importing
 *  and exposing route components through a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import application route modules
 *  - Provide a centralized export for routes
 *  - Simplify route imports across the application
 *  - Maintain a single access point for registered route modules
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import health from "./health.route.js";
import users from "./users.route.js";
import auth from "./auth.route.js";

export default {
    health,
    users,
    auth,
};