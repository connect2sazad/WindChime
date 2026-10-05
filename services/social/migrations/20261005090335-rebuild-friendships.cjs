'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const [rows] = await queryInterface.sequelize.query(
            'SELECT COUNT(*) AS total FROM friendships'
        );

        if (Number(rows[0].total) !== 0) {
            throw new Error('Friendships must be empty before this migration');
        }

        await queryInterface.renameTable(
            'friendships', 'friendships_legacy'
        );

        await queryInterface.createTable('friendships', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },
            user_low_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            user_high_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            requester_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
            },
            status: {
                type: Sequelize.ENUM(
                    'pending', 'accepted', 'rejected',
                    'cancelled', 'expired'
                ),
                allowNull: false,
                defaultValue: 'pending',
            },
            requested_at: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            accepted_at: {
                type: Sequelize.DATE,
                allowNull: true,
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

        await queryInterface.addConstraint('friendships', {
            fields: ['user_low_id', 'user_high_id'],
            type: 'unique',
            name: 'friendships_user_pair_unique',
        });

        await queryInterface.addIndex(
            'friendships',
            ['status', 'requested_at'],
            { name: 'friendships_expiration_index' }
        );
    },

    async down(queryInterface) {
        const [rows] = await queryInterface.sequelize.query(
            'SELECT COUNT(*) AS total FROM friendships'
        );

        if (Number(rows[0].total) !== 0) {
            throw new Error('Rollback would discard friendship data');
        }

        await queryInterface.dropTable('friendships');
        await queryInterface.renameTable(
            'friendships_legacy', 'friendships'
        );
    },
};