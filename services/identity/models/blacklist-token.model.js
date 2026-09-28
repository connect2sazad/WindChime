/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/blacklist-token.model.js
 *  Module        : Data Models
 *  Type          : Token Blacklist Model
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the Sequelize TokenBlacklist model used to store revoked tokens
 *  and prevent them from being accepted before their expiration.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the TokenBlacklist Sequelize model
 *  - Apply shared base model fields
 *  - Store blacklisted token values
 *  - Associate blacklisted tokens with user IDs
 *  - Store token expiration timestamps
 *  - Enforce uniqueness of stored token values
 *  - Map the model to the token_blacklist database table
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { DataTypes } from 'sequelize';

import sequelize from '../config/sequelize.js';
import BaseModel from './base.model.js';

const TokenBlacklist = sequelize.define(
    'TokenBlacklist',
    {
        ...BaseModel.BaseFields,

        token: {
            type: DataTypes.TEXT,
            allowNull: false,

        },

        token_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        expires_at: {
            type: DataTypes.DATE,
            allowNull: true
        },

        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },

    },
    {
        tableName: 'token_blacklist',
        timestamps: false,
        underscored: true,
    }
);

export default TokenBlacklist;