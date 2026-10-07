import { Op } from 'sequelize';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import sequelize from '../config/sequelize.js';
import Access from '../services/access.service.js';
import { Id,Start,Send,Read,Inbox,Cursor } from '../schemas/messaging.schema.js';
import { parseRequest } from '../utils/validation.js';
import errors from '../errors/registry.js';
const peerOf=(row,id)=>row.user_low_id===id?row.user_high_id:row.user_low_id;
const readField=(row,id)=>row.user_low_id===id?'low_read_id':'high_read_id';
const peerRead=(row,id)=>row.user_low_id===id?row.high_read_id:row.low_read_id;
const success=(res,data,status=200,extra={})=>res.status(status).json({success:true,data,...extra});
async function member(req,transaction){const id=parseRequest(Id,req.params.conversation_id);const row=await Conversation.findByPk(id,{transaction,...(transaction?{lock:transaction.LOCK.UPDATE}:{})});if(!row||![row.user_low_id,row.user_high_id].includes(req.auth.id))throw new errors.NotFoundException('Conversation not found');await Access.requireFriend(req,peerOf(row,req.auth.id));return row;}
export class MessagingController {
 async start(req,res,next){try{const {recipient_id}=parseRequest(Start,req.body);await Access.requireFriend(req,recipient_id);const [row]=await Conversation.findOrCreate({where:{user_low_id:Math.min(req.auth.id,recipient_id),user_high_id:Math.max(req.auth.id,recipient_id)}});return success(res,{id:row.id,peer_id:recipient_id});}catch(e){next(e);}}
 async inbox(req,res,next){try{const {page,limit}=parseRequest(Inbox,req.query);const {count,rows}=await Conversation.findAndCountAll({where:{[Op.or]:[{user_low_id:req.auth.id},{user_high_id:req.auth.id}]},order:[['last_message_at','DESC'],['id','DESC']],limit,offset:(page-1)*limit});const data=[];
  for(const row of rows){try{await Access.requireFriend(req,peerOf(row,req.auth.id));}catch(e){if([403,404].includes(e.statusCode))continue;throw e;}const last=await Message.findOne({where:{conversation_id:row.id},order:[['id','DESC']]});const unread=await Message.count({where:{conversation_id:row.id,sender_id:{[Op.ne]:req.auth.id},id:{[Op.gt]:row[readField(row,req.auth.id)]}}});data.push({id:row.id,peer_id:peerOf(row,req.auth.id),last_message:last?.toJSON()||null,unread,peer_read_id:peerRead(row,req.auth.id)});}
  return success(res,data,200,{pagination:{page,has_next_page:page*limit<count}});
 }catch(e){next(e);}}
 async messages(req,res,next){try{const query=parseRequest(Cursor,req.query);const row=await member(req);const where={conversation_id:row.id,...(query.before?{id:{[Op.lt]:query.before}}:query.after?{id:{[Op.gt]:query.after}}:{})};const rows=await Message.findAll({where,order:[['id',query.after?'ASC':'DESC']],limit:query.limit+1});const has_more=rows.length>query.limit;const selected=rows.slice(0,query.limit);if(!query.after)selected.reverse();return success(res,selected.map(item=>item.toJSON()),200,{peer_id:peerOf(row,req.auth.id),peer_read_id:peerRead(row,req.auth.id),has_more});}catch(e){next(e);}}
 async send(req,res,next){try{const input=parseRequest(Send,req.body);let created=false;const data=await sequelize.transaction(async transaction=>{const row=await member(req,transaction);const existing=await Message.findOne({where:{conversation_id:row.id,sender_id:req.auth.id,client_message_id:input.client_message_id},transaction});if(existing){if(existing.content!==input.content)throw new errors.ConflictException('Retry ID already used for different text');return existing.toJSON();}const message=await Message.create({...input,conversation_id:row.id,sender_id:req.auth.id},{transaction});await row.update({last_message_at:message.created_at,[readField(row,req.auth.id)]:message.id},{transaction});created=true;return message.toJSON();});return success(res,data,created?201:200);}catch(e){next(e);}}
 async read(req,res,next){try{const {message_id}=parseRequest(Read,req.body);await sequelize.transaction(async transaction=>{const row=await member(req,transaction);const message=await Message.findOne({where:{id:message_id,conversation_id:row.id},transaction});if(!message)throw new errors.ValidationException('Read marker must belong to this conversation');const field=readField(row,req.auth.id);await row.update({[field]:Math.max(row[field],message_id)},{transaction});});return success(res,{read:true});}catch(e){next(e);}}
}
export default new MessagingController();
