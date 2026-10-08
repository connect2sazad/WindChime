/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : seeders/20260918035235-create-default-users.cjs
 *  Module        : Database Seeders
 *  Type          : Default Users Seeder
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Seeds the users database table with predefined default user accounts
 *  required for application development, testing, or initial setup.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Create predefined default user records
 *  - Hash the default user password before database insertion
 *  - Populate required user account fields
 *  - Initialize default user account status
 *  - Populate creation and update timestamps
 *  - Insert default users using a bulk database operation
 *  - Provide rollback support by removing seeded user records
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {

        const password = await bcrypt.hash('Password@123456789', 12);
        const now = new Date();

        await queryInterface.bulkInsert('users', [
            {
                name: 'Sazad',
                username: 'connect2sazad',
                email: 'mail2sazad@gmail.com',
                password,
                status: true,
                created_at: now,
                updated_at: now
            },
            {
                name: 'Tester',
                username: 'tester',
                email: 'tester@example.com',
                password,
                status: true,
                created_at: now,
                updated_at: now
            }
        ]);
    },

    async down(queryInterface, Sequelize) {

        await queryInterface.bulkDelete('users', {
            username: {
                [Sequelize.Op.in]: [
                    'connect2sazad',
                    'tester'
                ]
            }
        });
    }
};