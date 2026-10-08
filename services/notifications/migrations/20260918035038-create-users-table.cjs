/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : migrations/20260918035038-create-users-table.cjs
 *  Module        : Database Migrations
 *  Type          : Users Table Migration
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the Sequelize migration responsible for creating and removing
 *  the users database table and its associated columns.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Create the users database table
 *  - Apply shared base migration fields
 *  - Define user-specific database columns
 *  - Enforce uniqueness of user email addresses
 *  - Apply shared timestamp and soft-delete columns
 *  - Provide rollback support by removing the users table
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

'use strict';

const { default: utils } = require('../utils/registry.js');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {

        await queryInterface.createTable(
            'users',
            {
                ...utils.BaseMigration.BaseFieldMigration,

                name: {
                    type: Sequelize.STRING(100),
                    allowNull: false,
                },

                username: {
                    type: Sequelize.STRING(50),
                    allowNull: false,
                    unique: true
                },

                email: {
                    type: Sequelize.STRING(150),
                    allowNull: false,
                    unique: true,
                },

                password: {
                    type: Sequelize.STRING(255),
                    allowNull: false,
                },

                ...utils.BaseMigration.BaseOptionsMigration,
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('users');
    }
};