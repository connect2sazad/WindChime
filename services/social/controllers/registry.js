/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : controllers/registry.js
 *  Module        : Controllers
 *  Type          : Controller Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application controllers by importing
 *  and exposing base and resource-specific controllers through a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import application controller classes
 *  - Instantiate application controllers
 *  - Register shared controller instances
 *  - Provide centralized access to controller instances
 *  - Simplify controller access across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import AuthController from './auth.controller.js';
import BaseController from './base.controller.js';
import UserController from './user.controller.js';


const user_controller = new UserController();
const auth_controller = new AuthController();

const Controllers = {
    BaseController,
    user_controller,
    auth_controller
};

export default Controllers;