import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import path from 'node:path';
import { Op,literal } from 'sequelize';
import { UPLOAD_DIR,cleanupFiles } from '../middlewares/upload-media.middleware.js';

class PostController extends BaseController {
 constructor(){super(Models.Post,{schema:Schemas.Post.PostSchema,createSchema:Schemas.Post.PostCreateSchema,updateSchema:Schemas.Post.PostUpdateSchema,
  creator:true,ownerOnly:true,includes:[{model:Models.PostMedia,as:'media'}],searchFields:['content'],idParam:'post_id'});}
 async prepareCreate(req,values){
  const files=req.files||[];
  if(!values.content&&!files.length)throw new errors.ValidationException('Write something or add media');
  if(values.kind==='reel'&&(files.length!==1||files[0].mediaKind!=='video'))throw new errors.ValidationException('A Reel requires one video');
  return values;
 }
 async afterCreate(req,post,transaction){
  if(req.files?.length)await Models.PostMedia.bulkCreate(req.files.map((file,index)=>({post_id:post.id,filename:file.filename,
   kind:file.mediaKind,mime_type:file.mimetype,size:file.size,sort_order:index})),{transaction});
 }
 async create(req,res,next){return super.create(req,res,error=>{cleanupFiles(req.files||[]).then(()=>next(error));});}
 async media(req,res,next){try{
  const post_id=this.parseId(req.params.post_id);const id=this.parseId(req.params.media_id);
  const post=await Models.Post.findByPk(post_id);if(!post||!post.status)throw new errors.NotFoundException('Post not found');
  const media=await Models.PostMedia.findOne({where:{id,post_id}});if(!media||path.basename(media.filename)!==media.filename)throw new errors.NotFoundException('Media not found');
  res.set({'Content-Type':media.mime_type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});
  res.vary('Authorization');
  return res.sendFile(path.join(UPLOAD_DIR,media.filename),error=>{if(error){if(error.code==='ENOENT')return next(new errors.NotFoundException('Media file not found'));next(error);}});
 }catch(e){next(e);}}
 async byAuthor(req,res,next){try{
  const creator_id=utils.Validations.parseRequest(Schemas.Base.ParamsIdSchema,{id:req.params.user_id}).id;
  if(req.query.status&&req.query.status!=='true')throw new errors.ValidationException('Only public active posts are available');
  const type=req.query.type||'all';if(!['all','text','photos','videos','reels'].includes(type))throw new errors.ValidationException('Invalid post type');
  const scope={creator_id,status:true};
  if(type==='reels')scope.kind='reel';
  if(['text','photos','videos'].includes(type)){scope.kind='post';const kind=type==='photos'?'image':'video';scope[Op.and]=literal(type==='text'?'NOT EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = Post.id)':`EXISTS (SELECT 1 FROM post_media pm WHERE pm.post_id = Post.id AND pm.kind = '${kind}')`);}
  return super.getAllPaginatedRecords(req,res,next,scope);
 }catch(e){next(e);}}
 async reshares(req,res,next){try{
  const creator_id=this.parseId(req.params.user_id);const {page,limit}=utils.Validations.parseRequest(Schemas.Pagination.PaginationSchema,req.query);
  const {count,rows}=await Models.PostRepost.findAndCountAll({where:{creator_id},include:[{model:Models.Post,as:'post',required:true,where:{status:true},include:this.includes}],distinct:true,limit,offset:(page-1)*limit,order:[['id','DESC']]});
  return res.json({success:true,message:'Reshares retrieved',data:rows.map(row=>({...this.serialize(row.post),reshared_at:row.created_at})),pagination:{page,limit,total:count,total_pages:Math.ceil(count/limit),has_next_page:page*limit<count,has_previous_page:page>1}});
 }catch(e){next(e);}}
}
export default PostController;
