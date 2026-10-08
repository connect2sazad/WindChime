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
 async feed(req,res,next){try{
  const mode=req.query.mode||'network';if(!['network','discover'].includes(mode))throw new errors.ValidationException('Invalid feed mode');
  if(req.query.status&&req.query.status!=='true')throw new errors.ValidationException('Only active posts are available');
  const viewer=this.parseId(req.auth.id);const scope={status:true};
  if(mode==='network')scope[Op.and]=literal(`(Post.creator_id = ${viewer} OR EXISTS (SELECT 1 FROM follows f WHERE f.follower_id = ${viewer} AND f.following_id = Post.creator_id) OR EXISTS (SELECT 1 FROM friendships fr WHERE fr.status = 'accepted' AND ((fr.user_low_id = ${viewer} AND fr.user_high_id = Post.creator_id) OR (fr.user_high_id = ${viewer} AND fr.user_low_id = Post.creator_id))))`);
  return super.getAllPaginatedRecords(req,res,next,scope);
 }catch(e){next(e);}}
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
  const media=await Models.PostMedia.findOne({where:{id,post_id}});if(!media||typeof media.filename!=='string'||path.basename(media.filename)!==media.filename||!/^[a-f0-9-]+\.(png|jpg|webp|mp4|webm)$/.test(media.filename)||!['image/png','image/jpeg','image/webp','video/mp4','video/webm'].includes(media.mime_type))throw new errors.NotFoundException('Media not found');
  res.set({'Content-Type':media.mime_type,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':'inline','Cross-Origin-Resource-Policy':'same-origin'});
  res.vary('Authorization');
  return res.sendFile(path.join(UPLOAD_DIR,media.filename),{dotfiles:'deny',cacheControl:false,lastModified:false},error=>{if(error&&(req.aborted||res.destroyed||error.code==='ECONNABORTED'))return;if(error){if(error.code==='ENOENT')return next(new errors.NotFoundException('Media file not found'));next(error);}});
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
