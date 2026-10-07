'use strict';
module.exports = {
 async up(q,S){
  await q.addColumn('users','bio',{type:S.STRING(500),allowNull:false,defaultValue:''});
  await q.addColumn('users','email_verified_at',{type:S.DATE,allowNull:true});
  await q.createTable('pending_signups',{
   id:{type:S.STRING(36),primaryKey:true,allowNull:false},
   name:{type:S.STRING(100),allowNull:false},username:{type:S.STRING(50),allowNull:false},email:{type:S.STRING(150),allowNull:false},
   password_hash:{type:S.STRING(255),allowNull:false},code_hash:{type:S.STRING(64),allowNull:false},
   expires_at:{type:S.DATE,allowNull:false},sent_at:{type:S.DATE,allowNull:false},attempts:{type:S.INTEGER,allowNull:false,defaultValue:0},
   resends:{type:S.INTEGER,allowNull:false,defaultValue:0},created_at:{type:S.DATE,allowNull:false},updated_at:{type:S.DATE,allowNull:false},
  });
  await q.addIndex('pending_signups',['expires_at'],{name:'pending_signups_expiration_index'});
 },
 async down(q){await q.dropTable('pending_signups');await q.removeColumn('users','email_verified_at');await q.removeColumn('users','bio');}
};
