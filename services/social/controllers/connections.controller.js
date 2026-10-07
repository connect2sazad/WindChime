import { Op } from 'sequelize';
import { z } from '../docs/openapi.js';
import Models from '../models/registry.js';
import utils from '../utils/registry.js';
import errors from '../errors/registry.js';
import Identity from '../services/identity.service.js';
const Query=z.object({view:z.enum(['incoming','sent','friends','following','followers']).default('incoming'),page:z.coerce.number().int().min(1).default(1),limit:z.coerce.number().int().min(1).max(50).default(10)}).strict();
const Params=z.object({user_id:z.coerce.number().int().positive()});
const respond=(res,data)=>res.json(utils.helpers.structurize_response(true,'Connections retrieved',data));
export class ConnectionsController {
 async publicList(req,res,next){try{
  const {user_id}=utils.Validations.parseRequest(Params,req.params);const query=utils.Validations.parseRequest(Query,req.query);
  if(!['friends','followers','following'].includes(query.view))throw new errors.ValidationException('Private requests cannot be viewed on profiles');
  await Identity.requireActiveUser(user_id,req.headers.authorization);
  return this.list({...req,query,auth:{...req.auth,id:user_id}},res,next);
 }catch(e){next(e);}}
 async list(req,res,next){try{
  const {view,page,limit}=utils.Validations.parseRequest(Query,req.query);const id=req.auth.id;
  let model,where;
  if(view==='following'||view==='followers'){model=Models.Follow;where={[view==='following'?'follower_id':'following_id']:id};}
  else {model=Models.Friendship;where={[Op.or]:[{user_low_id:id},{user_high_id:id}],status:view==='friends'?'accepted':'pending',...(view==='sent'?{requester_id:id}:view==='incoming'?{requester_id:{[Op.ne]:id}}:{})};}
  const {rows,count}=await model.findAndCountAll({where,limit,offset:(page-1)*limit,order:[['id','DESC']]});
  const data=rows.map(row=>{const value=row.toJSON();return {...value,user_id:model===Models.Follow?(view==='following'?value.following_id:value.follower_id):(value.user_low_id===id?value.user_high_id:value.user_low_id)};});
  return res.json({...utils.helpers.structurize_response(true,'Connections retrieved'),data,pagination:{page,limit,total:count,total_pages:Math.ceil(count/limit),has_next_page:page*limit<count,has_previous_page:page>1}});
 }catch(e){next(e);}}
 async relationship(req,res,next){try{
  const {user_id}=utils.Validations.parseRequest(Params,req.params);const id=req.auth.id;
  const [friendship,following,follower]=await Promise.all([
   Models.Friendship.findOne({where:{user_low_id:Math.min(id,user_id),user_high_id:Math.max(id,user_id)}}),
   Models.Follow.findOne({where:{follower_id:id,following_id:user_id}}),
   Models.Follow.findOne({where:{follower_id:user_id,following_id:id}})]);
  return respond(res,{friendship:friendship?.toJSON()||null,following:Boolean(following),follows_you:Boolean(follower)});
 }catch(e){next(e);}}
 async follow(req,res,next){try{
  const {user_id}=utils.Validations.parseRequest(Params,req.params);
  if(user_id===req.auth.id)throw new errors.ValidationException('You cannot follow yourself');
  await Identity.requireActiveUser(user_id,req.headers.authorization);
  const [row]=await Models.Follow.findOrCreate({where:{follower_id:req.auth.id,following_id:user_id}});
  return respond(res,row.toJSON());
 }catch(e){next(e);}}
 async unfollow(req,res,next){try{
  const {user_id}=utils.Validations.parseRequest(Params,req.params);
  await Models.Follow.destroy({where:{follower_id:req.auth.id,following_id:user_id}});
  return respond(res,{following:false});
 }catch(e){next(e);}}
}
export default new ConnectionsController();
