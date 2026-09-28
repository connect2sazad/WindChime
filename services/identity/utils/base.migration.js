/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : utils/base.migration.js
 *  Module        : Database Migrations
 *  Type          : Base Migration Definition
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines reusable Sequelize column definitions that provide a consistent
 *  foundation for application database migrations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the shared primary key column
 *  - Define the shared status column
 *  - Define shared creation and update timestamp columns
 *  - Define the shared soft-delete timestamp column
 *  - Configure default timestamp values
 *  - Provide reusable column definitions for database migrations
 *  - Maintain consistent common columns across application tables
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

'use strict';

import { DataTypes, Sequelize } from 'sequelize';


const BaseFieldMigration = {

    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },

    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },

};


const BaseOptionsMigration = {

    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },

    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    },

    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },

};


const BaseMigration = {
    BaseFieldMigration,
    BaseOptionsMigration,
};


export default BaseMigration;