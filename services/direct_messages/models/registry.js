/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/registry.js
 *  Module        : Data Models
 *  Type          : Model Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for Sequelize models and ensures model
 *  associations are initialized before the models are exposed to the
 *  application.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Initialize Sequelize model associations
 *  - Import application models
 *  - Register application models in a centralized collection
 *  - Provide a single access point for registered models
 *  - Simplify model imports across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import './associations.js';

import User from "./user.model.js";
import TokenBlacklist from "./blacklist-token.model.js";

const Models = {
    User,
    TokenBlacklist
};

export default Models;