/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : controllers/user.controller.js
 *  Module        : Controllers
 *  Type          : User Controller
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the controller configuration for user resources by extending the
 *  application's BaseController with user-specific schemas, model settings,
 *  and searchable fields.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Extend the application's BaseController
 *  - Configure the User model for controller operations
 *  - Configure user serialization and validation schemas
 *  - Define searchable fields for user records
 *  - Configure model associations included in user queries
 *  - Configure creator tracking behavior for user operations
 *  - Provide user-specific search conditions when required
 *  - Inherit common CRUD and pagination operations from BaseController
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import Schemas from "../schemas/registry.js";
import BaseController from "./base.controller.js";
import Models from "../models/registry.js";

class UserController extends BaseController {

    constructor() {

        const settings = {
            schema: Schemas.Users.UserSchema,
            createSchema: Schemas.Users.UserCreateSchema,
            updateSchema: Schemas.Users.UserUpdateSchema,
            creator: false,
            includes: [],
            searchFields: [
                "name",
                "username",
                "email",
            ],
        };

        super(Models.User, settings);
    }
}

export default UserController;