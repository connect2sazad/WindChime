'use strict';
module.exports={async up(queryInterface,Sequelize){await queryInterface.addColumn('users','avatar_filename',{type:Sequelize.STRING(100),allowNull:true});},async down(queryInterface){await queryInterface.removeColumn('users','avatar_filename');}};
