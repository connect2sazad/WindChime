'use strict';
module.exports={async up(q,S){await q.addColumn('messages','forwarded_from_id',{type:S.INTEGER,allowNull:true});},async down(q){await q.removeColumn('messages','forwarded_from_id');}};
