'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('follows', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            follower_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            following_id: {
                type: Sequelize.INTEGER,
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

        await queryInterface.addConstraint('follows', {
            fields: ['follower_id', 'following_id'],
            type: 'unique',
            name: 'follows_follower_following_unique',
        });

        await queryInterface.addIndex('follows', ['following_id'], {
            name: 'follows_following_index',
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('follows');
    },
};