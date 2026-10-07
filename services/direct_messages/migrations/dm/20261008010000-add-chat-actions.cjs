'use strict';
module.exports={async up(q,S){
 await q.addColumn('messages','reply_to_id',{type:S.INTEGER,allowNull:true});
 await q.addColumn('messages','forwarded',{type:S.BOOLEAN,allowNull:false,defaultValue:false});
 await q.addColumn('messages','deleted_at',{type:S.DATE,allowNull:true});
 await q.addColumn('messages','updated_at',{type:S.DATE,allowNull:true});
 await q.sequelize.query('UPDATE messages SET updated_at = created_at WHERE updated_at IS NULL');
 await q.createTable('message_reactions',{id:{type:S.INTEGER,primaryKey:true,autoIncrement:true,allowNull:false},message_id:{type:S.INTEGER,allowNull:false,references:{model:'messages',key:'id'},onDelete:'CASCADE'},creator_id:{type:S.INTEGER,allowNull:false},type:{type:S.ENUM('like','love','laugh','sad','angry'),allowNull:false},created_at:{type:S.DATE,allowNull:false},updated_at:{type:S.DATE,allowNull:false}});
 await q.addConstraint('message_reactions',{fields:['message_id','creator_id'],type:'unique',name:'message_reactions_user_unique'});
},async down(q){await q.dropTable('message_reactions');for(const field of ['updated_at','deleted_at','forwarded','reply_to_id'])await q.removeColumn('messages',field);}};
