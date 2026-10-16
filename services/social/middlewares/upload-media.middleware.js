import multer from 'multer';
import { photoDimensions } from '../utils/photo-dimensions.js';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import errors from '../errors/registry.js';
export const UPLOAD_DIR=fileURLToPath(new URL('../uploads/posts/',import.meta.url));
const TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
export async function cleanupFiles(files=[]){const list=Array.isArray(files)?files:Object.values(files||{}).flat();await Promise.allSettled(list.filter(file=>file?.path).map(file=>fs.unlink(file.path)));}
export async function optimizePhoto(file){
 const originalPath=file.path;const filename=randomUUID()+'.webp';const optimizedPath=path.join(UPLOAD_DIR,filename);
 try{
  const result=await sharp(originalPath,{limitInputPixels:64000000}).rotate().resize({width:2048,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:4}).toFile(optimizedPath);
  await fs.unlink(originalPath);file.filename=filename;file.path=optimizedPath;file.mimetype='image/webp';file.size=result.size;
  file.dimensions={width:result.width,height:result.height};
 }catch(error){
  await fs.unlink(optimizedPath).catch(()=>{});
  if(error instanceof errors.ValidationException)throw error;
  throw new errors.ValidationException('This photo could not be optimized. Use a valid JPG, PNG or WebP image.');
 }
}
export function sniffMime(buffer){
 if(buffer.length>=8&&buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(buffer.length>=3&&buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg';
 if(buffer.length>=12&&buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'image/webp';
 if(buffer.length>=12&&buffer.toString('ascii',4,8)==='ftyp')return 'video/mp4';
 if(buffer.length>=4&&buffer.subarray(0,4).equals(Buffer.from([26,69,223,163])))return 'video/webm';
 return null;
}
const uploader=multer({
 storage:multer.diskStorage({destination(req,file,cb){mkdirSync(UPLOAD_DIR,{recursive:true});cb(null,UPLOAD_DIR);},filename(req,file,cb){cb(null,randomUUID()+'.'+TYPES[file.mimetype]);}}),
 limits:{fileSize:50*1024*1024,files:13,fields:4,fieldSize:16*1024},
 fileFilter(req,file,cb){if(!TYPES[file.mimetype])return cb(new errors.ValidationException('Use JPG, PNG, WebP, MP4 or WebM'));cb(null,true);},
}).fields([{name:'media',maxCount:12},{name:'thumbnail',maxCount:1}]);
export async function validateFiles(files=[]){
 if(files.length>12)throw new errors.ValidationException('Choose up to 12 photos');
 let videos=0;
 for(const file of files){
  const handle=await fs.open(file.path,'r');const buffer=Buffer.alloc(16);
  try{await handle.read(buffer,0,16,0);}finally{await handle.close();}
  const mime=sniffMime(buffer);if(mime!==file.mimetype)throw new errors.ValidationException('File content does not match its media type');
  file.mediaKind=mime.startsWith('image/')?'image':'video';
  if(file.mediaKind==='image'&&file.size>10*1024*1024)throw new errors.ValidationException('Each image must be 10 MB or smaller');
  if(file.mediaKind==='image'){file.dimensions=await photoDimensions(file.path);await optimizePhoto(file);}
  if(file.mediaKind==='video')videos++;
 }
 if(videos&&(videos!==1||files.length!==1))throw new errors.ValidationException('Choose up to 12 photos or one video, not both');
}
export default function uploadMedia(req,res,next){uploader(req,res,async error=>{
 try{
  if(error)throw error;
  const uploaded=req.files||{};req.files=uploaded.media||[];req.thumbnailFile=uploaded.thumbnail?.[0]||null;
  await validateFiles(req.files);
  if(req.thumbnailFile){
   if(req.files.length!==1||req.files[0].mediaKind!=='video')throw new errors.ValidationException('A thumbnail can only accompany one video');
   const handle=await fs.open(req.thumbnailFile.path,'r');const buffer=Buffer.alloc(16);
   try{await handle.read(buffer,0,16,0);}finally{await handle.close();}
   const mime=sniffMime(buffer);if(!mime?.startsWith('image/')||mime!==req.thumbnailFile.mimetype)throw new errors.ValidationException('Video thumbnail must be a valid image');
   req.thumbnailFile.mediaKind='image';
   if(req.thumbnailFile.size>10*1024*1024)throw new errors.ValidationException('Video thumbnail is too large');
   await optimizePhoto(req.thumbnailFile);
  }
  next();
 }
 catch(e){const uploaded=req.files;await cleanupFiles([...cleanupFilesList(uploaded),req.thumbnailFile].filter(Boolean));if(e.code==='LIMIT_FILE_SIZE'){const tooLarge=new Error('Video exceeds the 50 MB limit');tooLarge.status=413;return next(tooLarge);}next(e instanceof multer.MulterError?new errors.ValidationException('Too many files or invalid upload fields'):e);}
});}
function cleanupFilesList(files){return Array.isArray(files)?files:Object.values(files||{}).flat();}
