'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('post_media', 'thumbnail_filename', {
            type: Sequelize.STRING(100),
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('post_media', 'thumbnail_filename');
    },
};
