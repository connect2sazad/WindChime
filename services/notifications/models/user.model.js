/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/user.model.js
 *  Module        : Data Models
 *  Type          : User Model
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the Sequelize User model and maps user records to the users
 *  database table using the application's shared base model configuration.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the User Sequelize model
 *  - Apply shared base model fields
 *  - Define user-specific database fields
 *  - Apply shared Sequelize model options
 *  - Map the model to the users database table
 *  - Provide the User model for database operations
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

const User = sequelize.define(
    'User',
    {
        ...BaseModel.BaseFields,

        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
        },

        email: {
            type: DataTypes.STRING(150),
            allowNull: false,
            unique: true
        },

        password: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
        }
        
    },
    {
        ...BaseModel.BaseOptions,
        tableName: 'users',
    }
);

export default User;