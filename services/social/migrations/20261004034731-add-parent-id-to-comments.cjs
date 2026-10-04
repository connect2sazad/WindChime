'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn('comments', 'parent_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'post_id',
      references: {
        model: 'comments',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    await queryInterface.addIndex(
      'comments',
      ['post_id', 'parent_id', 'id'],
      { name: 'comments_post_parent_id_index' }
    );
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    await queryInterface.removeIndex(
      'comments',
      'comments_post_parent_id_index'
    );
    await queryInterface.removeColumn('comments', 'parent_id');
  }
};
