import { Op } from 'sequelize';
import { randomUUID } from 'node:crypto';
import { copyFile,mkdir } from 'node:fs/promises';
import path from 'node:path';
import sequelize from '../config/sequelize.js';
import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import MessageReaction from '../models/message-reaction.model.js';
import Access from '../services/access.service.js';
import { Id,Reaction,Forward,Sync } from '../schemas/messaging.schema.js';
import { parseRequest } from '../utils/validation.js';
import errors from '../errors/registry.js';
import { member,enrich,attachmentsOf,sourcePost } from './messaging.controller.js';
import { UPLOAD_DIR,cleanupFiles } from '../middlewares/upload-media.middleware.js';
const respond=(res,data)=>res.json({success:true,data});
async function messageIn(req,transaction,allowDeleted=false){const row=await member(req,transaction);const message=await Message.findOne({where:{id:parseRequest(Id,req.params.message_id),conversation_id:row.id},transaction,...(transaction?{lock:transaction.LOCK.UPDATE}:{})});if(!message||(!allowDeleted&&message.deleted_at))throw new errors.NotFoundException('Message unavailable');return {row,message};}
export class ChatActionsController {
 async sync(req,res,next){try{const {ids}=parseRequest(Sync,req.body);const row=await member(req);const messages=await Message.findAll({where:{id:{[Op.in]:ids},conversation_id:row.id},order:[['id','ASC']]});return respond(res,await enrich(messages,req));}catch(e){next(e);}}
 async remove(req,res,next){let files=[];try{const data=await sequelize.transaction(async transaction=>{const {message}=await messageIn(req,transaction,true);if(message.sender_id!==req.auth.id)throw new errors.ForbiddenException('Only the sender can delete this message');if(!message.deleted_at){files=attachmentsOf(message.attachments).filter(file=>typeof file.filename==='string'&&/^[a-f0-9-]+\.(png|jpg|webp|mp4|webm)$/.test(file.filename)).map(file=>({path:path.join(UPLOAD_DIR,file.filename)}));await message.update({deleted_at:new Date(),content:'',attachments:[],shared_post_id:null},{transaction});await MessageReaction.destroy({where:{message_id:message.id},transaction});}return (await enrich([message],req,transaction))[0];});await cleanupFiles(files);return respond(res,data);}catch(e){next(e);}}
 async react(req,res,next){try{const input=parseRequest(Reaction,req.body);const data=await sequelize.transaction(async transaction=>{const {message}=await messageIn(req,transaction);const where={message_id:message.id,creator_id:req.auth.id};const existing=await MessageReaction.findOne({where,transaction});if(existing)await existing.update(input,{transaction});else await MessageReaction.create({...where,...input},{transaction});return (await enrich([message],req,transaction))[0];});return respond(res,data);}catch(e){next(e);}}
 async unreact(req,res,next){try{const data=await sequelize.transaction(async transaction=>{const {message}=await messageIn(req,transaction);await MessageReaction.destroy({where:{message_id:message.id,creator_id:req.auth.id},transaction});return (await enrich([message],req,transaction))[0];});return respond(res,data);}catch(e){next(e);}}
 async forward(req,res,next){const copies=[];let persisted=false;try{const input=parseRequest(Forward,req.body);const source=await member(req);await Access.requireFriend(req,input.recipient_id);const [target]=await Conversation.findOrCreate({where:{user_low_id:Math.min(req.auth.id,input.recipient_id),user_high_id:Math.max(req.auth.id,input.recipient_id)}});
  const data=await sequelize.transaction(async transaction=>{
   await Conversation.findAll({where:{id:{[Op.in]:[source.id,target.id]}},order:[['id','ASC']],transaction,lock:transaction.LOCK.UPDATE});
   await Access.requireFriend(req,source.user_low_id===req.auth.id?source.user_high_id:source.user_low_id);await Access.requireFriend(req,input.recipient_id);
   const original=await Message.findOne({where:{id:parseRequest(Id,req.params.message_id),conversation_id:source.id},transaction});if(!original||original.deleted_at)throw new errors.NotFoundException('Message unavailable');
   const existing=await Message.findOne({where:{conversation_id:target.id,sender_id:req.auth.id,client_message_id:input.client_message_id},transaction});
   if(existing){if(!existing.forwarded||existing.deleted_at||existing.forwarded_from_id!==original.id)throw new errors.ConflictException('Retry ID already used');return {conversation_id:target.id,message:(await enrich([existing],req,transaction))[0]};}
   if(original.shared_post_id)await sourcePost(req,original.shared_post_id);
   await mkdir(UPLOAD_DIR,{recursive:true});const attachments=[];
   for(const file of attachmentsOf(original.attachments)){if(!/^[a-f0-9-]+\.(png|jpg|webp|mp4|webm)$/.test(file.filename))throw new errors.NotFoundException('Attachment unavailable');const filename=randomUUID()+path.extname(file.filename);const destination=path.join(UPLOAD_DIR,filename);copies.push({path:destination});await copyFile(path.join(UPLOAD_DIR,file.filename),destination);attachments.push({...file,filename});}
   const message=await Message.create({conversation_id:target.id,sender_id:req.auth.id,content:original.content,shared_post_id:original.shared_post_id,attachments,forwarded:true,forwarded_from_id:original.id,client_message_id:input.client_message_id},{transaction});await target.update({last_message_at:message.created_at,[target.user_low_id===req.auth.id?'low_read_id':'high_read_id']:message.id},{transaction});return {conversation_id:target.id,message:(await enrich([message],req,transaction))[0]};
  });persisted=true;return respond(res,data);
 }catch(e){if(!persisted)await cleanupFiles(copies);next(e);}}
}
export default new ChatActionsController();
