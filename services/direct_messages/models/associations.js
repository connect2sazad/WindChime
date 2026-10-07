/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/associations.js
 *  Module        : Data Models
 *  Type          : Model Association Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines and initializes Sequelize associations between application models
 *  to establish relationships used for relational database operations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import models participating in database relationships
 *  - Define associations between application models
 *  - Configure association foreign keys
 *  - Configure association aliases
 *  - Establish User and TokenBlacklist relationships
 *  - Export associated models for reuse when required
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import User from "./user.model.js";
import TokenBlacklist from "./blacklist-token.model.js";

// Associate TokenBlacklist & User
TokenBlacklist.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'owner',
});

User.hasMany(TokenBlacklist, {
    foreignKey: 'user_id',
    as: 'blacklisted_tokens',
});

export {
    User,
    TokenBlacklist
};