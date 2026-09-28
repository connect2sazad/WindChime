/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : migrations/20260918035054-create-token-blacklist-table.cjs
 *  Module        : Database Migrations
 *  Type          : Token Blacklist Table Migration
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the Sequelize migration responsible for creating and removing
 *  the token blacklist database table used to store revoked authentication
 *  tokens associated with application users.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Create the token blacklist database table
 *  - Apply shared base migration fields
 *  - Store revoked authentication tokens
 *  - Enforce uniqueness of blacklisted tokens
 *  - Associate blacklist records with application users
 *  - Define the foreign key relationship to the users table
 *  - Configure foreign key update and deletion behavior
 *  - Record the creation timestamp for blacklist entries
 *  - Provide rollback support by removing the token blacklist table
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
            'token_blacklist',
            {
                ...utils.BaseMigration.BaseFieldMigration,

                token: {
                    type: Sequelize.TEXT,
                    allowNull: false,

                },

                user_id: {
                    type: Sequelize.INTEGER,
                    allowNull: false,
                    index: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'RESTRICT',
                },

                created_at: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
                },
            }
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('token_blacklist');
    }
};