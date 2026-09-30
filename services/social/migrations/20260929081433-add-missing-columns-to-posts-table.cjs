'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {

    await queryInterface.addColumn('posts', 'creator_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      after: 'id'
    });

    await queryInterface.addColumn('posts', 'status', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
    });

    await queryInterface.addColumn('posts', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.removeColumn('posts', 'author_id');

  },

  async down (queryInterface, Sequelize) {

    await queryInterface.removeColumn('posts', 'creator_id');
    await queryInterface.removeColumn('posts', 'status');
    await queryInterface.removeColumn('posts', 'deleted_at');
    
    await queryInterface.addColumn('posts', 'author_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

  }
};
