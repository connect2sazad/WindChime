import multer from 'multer';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import errors from '../errors/registry.js';
export const UPLOAD_DIR=fileURLToPath(new URL('../uploads/posts/',import.meta.url));
const TYPES={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
export async function cleanupFiles(files=[]){await Promise.allSettled(files.map(file=>fs.unlink(file.path)));}
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
 limits:{fileSize:50*1024*1024,files:5,fields:4,fieldSize:16*1024},
 fileFilter(req,file,cb){if(!TYPES[file.mimetype])return cb(new errors.ValidationException('Use JPG, PNG, WebP, MP4 or WebM'));cb(null,true);},
}).array('media',5);
export async function validateFiles(files=[]){
 let videos=0;
 for(const file of files){
  const handle=await fs.open(file.path,'r');const buffer=Buffer.alloc(16);
  try{await handle.read(buffer,0,16,0);}finally{await handle.close();}
  const mime=sniffMime(buffer);if(mime!==file.mimetype)throw new errors.ValidationException('File content does not match its media type');
  file.mediaKind=mime.startsWith('image/')?'image':'video';
  if(file.mediaKind==='image'&&file.size>10*1024*1024)throw new errors.ValidationException('Each image must be 10 MB or smaller');
  if(file.mediaKind==='video')videos++;
 }
 if(videos&&(videos!==1||files.length!==1))throw new errors.ValidationException('Choose up to five images or one video, not both');
}
export default function uploadMedia(req,res,next){uploader(req,res,async error=>{
 try{if(error)throw error;await validateFiles(req.files||[]);next();}
 catch(e){await cleanupFiles(req.files||[]);if(e.code==='LIMIT_FILE_SIZE'){const tooLarge=new Error('Video exceeds the 50 MB limit');tooLarge.status=413;return next(tooLarge);}next(e instanceof multer.MulterError?new errors.ValidationException('Too many files or invalid upload fields'):e);}
});}
