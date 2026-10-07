'use strict';
module.exports={async up(q,S){await q.addColumn('messages','attachments',{type:S.JSON,allowNull:true});await q.addColumn('messages','shared_post_id',{type:S.INTEGER,allowNull:true});},async down(q){await q.removeColumn('messages','shared_post_id');await q.removeColumn('messages','attachments');}};
