'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('users', 'session_version', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        });
        await queryInterface.createTable('password_reset_codes', {
            id: { type: Sequelize.STRING(36), allowNull: false, primaryKey: true },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'users', key: 'id' },
                onDelete: 'CASCADE',
            },
            code_hash: { type: Sequelize.STRING(64), allowNull: false },
            expires_at: { type: Sequelize.DATE, allowNull: false },
            attempts: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('password_reset_codes', ['user_id'], {
            name: 'password_reset_codes_user_unique',
            unique: true,
        });
        await queryInterface.addIndex('password_reset_codes', ['expires_at'], {
            name: 'password_reset_codes_expiration_index',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('password_reset_codes');
        await queryInterface.removeColumn('users', 'session_version');
    },
};
