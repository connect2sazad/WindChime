'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('posts', 'kind', {
            type: Sequelize.ENUM('post', 'reel'), allowNull: false, defaultValue: 'post',
        });
        await queryInterface.createTable('post_media', {
            id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
            post_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE' },
            filename: { type: Sequelize.STRING(100), allowNull: false },
            kind: { type: Sequelize.ENUM('image', 'video'), allowNull: false },
            mime_type: { type: Sequelize.STRING(50), allowNull: false },
            size: { type: Sequelize.INTEGER, allowNull: false },
            sort_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
            created_at: { type: Sequelize.DATE, allowNull: false },
            updated_at: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('post_media', ['post_id', 'sort_order'], { name: 'post_media_order_index' });
    },
    async down(queryInterface) {
        await queryInterface.dropTable('post_media');
        await queryInterface.removeColumn('posts', 'kind');
    },
};
