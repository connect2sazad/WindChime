import multer from 'multer';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { mkdir,writeFile,unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
export const AVATAR_DIR=fileURLToPath(new URL('../uploads/avatars/',import.meta.url));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:0},fileFilter(req,file,cb){if(!['image/jpeg','image/png','image/webp'].includes(file.mimetype))return cb(new errors.ValidationException('Use JPG, PNG or WebP'));cb(null,true);}}).single('picture');
export function uploadAvatar(req,res,next){upload(req,res,error=>{if(!error)return next();if(error.code==='LIMIT_FILE_SIZE')return next(new errors.AppException({status_code:413,code:'PAYLOAD_TOO_LARGE'},'Profile picture must be 5 MB or smaller'));if(error instanceof multer.MulterError)return next(new errors.ValidationException('Upload one picture only'));next(error);});}
async function removeFile(filename){if(filename&&/^[a-f0-9-]+\.webp$/.test(filename))await unlink(path.join(AVATAR_DIR,filename)).catch(error=>{if(error.code!=='ENOENT')console.error('Could not remove replaced avatar file');});}
export class AvatarController {
 async set(req,res,next){let filename;try{
  if(!req.file)throw new errors.ValidationException('Choose a picture');
  let buffer;try{const image=sharp(req.file.buffer,{limitInputPixels:20000000,animated:false});const info=await image.metadata();if(!['jpeg','png','webp'].includes(info.format))throw new Error();buffer=await image.rotate().resize(512,512,{fit:'cover'}).webp({quality:85}).toBuffer();}catch{throw new errors.ValidationException('The image could not be read. Use a valid JPG, PNG or WebP');}
  filename=randomUUID()+'.webp';await mkdir(AVATAR_DIR,{recursive:true});await writeFile(path.join(AVATAR_DIR,filename),buffer,{flag:'wx',mode:0o600});
  const previous=await Models.User.sequelize.transaction(async transaction=>{const user=await Models.User.findByPk(req.auth.id,{transaction,lock:transaction.LOCK.UPDATE});if(!user||!user.status)throw new errors.UnauthorizedException();const old=user.avatar_filename;await user.update({avatar_filename:filename},{transaction});return old;});
  await removeFile(previous);return res.json(utils.helpers.structurize_response(true,'Profile picture updated',{avatar_version:filename}));
 }catch(error){await removeFile(filename);next(error);}}
 async remove(req,res,next){try{const previous=await Models.User.sequelize.transaction(async transaction=>{const user=await Models.User.findByPk(req.auth.id,{transaction,lock:transaction.LOCK.UPDATE});if(!user||!user.status)throw new errors.UnauthorizedException();const old=user.avatar_filename;await user.update({avatar_filename:null},{transaction});return old;});await removeFile(previous);return res.json(utils.helpers.structurize_response(true,'Profile picture removed',{avatar_version:null}));}catch(error){next(error);}}
 async get(req,res,next){try{const id=Number(req.params.id);if(!Number.isSafeInteger(id)||id<1)throw new errors.ValidationException('Invalid profile ID');const user=await Models.User.findByPk(id);if(!user||!user.status||!user.avatar_filename||!/^[a-f0-9-]+\.webp$/.test(user.avatar_filename))throw new errors.NotFoundException('Profile picture not found');res.set({'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.vary('Authorization');res.sendFile(path.join(AVATAR_DIR,user.avatar_filename),error=>{if(error)next(error.code==='ENOENT'?new errors.NotFoundException('Profile picture not found'):error);});}catch(error){next(error);}}
}
export default new AvatarController();
