'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('notifications', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            source_service: {
                type: Sequelize.STRING(32),
                allowNull: false,
            },
            event_id: {
                type: Sequelize.UUID,
                allowNull: false,
            },
            recipient_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            actor_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            type: {
                type: Sequelize.STRING(64),
                allowNull: false,
            },
            target_type: {
                type: Sequelize.STRING(32),
                allowNull: false,
            },
            target_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            context: {
                type: Sequelize.JSON,
                allowNull: true,
            },
            read_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
            },
            occurred_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });

        await queryInterface.addIndex(
            'notifications',
            ['source_service', 'event_id', 'recipient_id'],
            {
                name: 'notifications_event_recipient_unique',
                unique: true,
            }
        );

        await queryInterface.addIndex(
            'notifications',
            ['recipient_id', 'id'],
            { name: 'notifications_recipient_id_index' }
        );

        await queryInterface.addIndex(
            'notifications',
            ['recipient_id', 'read_at', 'id'],
            { name: 'notifications_unread_index' }
        );
    },

    async down(queryInterface) {
        await queryInterface.dropTable('notifications');
    },
};