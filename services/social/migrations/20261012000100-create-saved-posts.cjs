'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('saved_posts', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      creator_id: { type: Sequelize.INTEGER, allowNull: false },
      post_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE' },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('saved_posts', { fields: ['creator_id', 'post_id'], type: 'unique', name: 'saved_posts_creator_post_unique' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('saved_posts');
  },
};
