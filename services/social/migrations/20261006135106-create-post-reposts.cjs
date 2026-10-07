'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('post_reposts', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            creator_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            post_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: { model: 'posts', key: 'id' },
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

        await queryInterface.addConstraint('post_reposts', {
            fields: ['post_id', 'creator_id'],
            type: 'unique',
            name: 'post_reposts_post_creator_unique',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('post_reposts');
    },
};