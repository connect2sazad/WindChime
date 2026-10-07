import { getEnv } from '../config/config.js';
import { Op } from 'sequelize';
import Models from '../models/registry.js';
import PendingSignup from '../models/pending-signup.model.js';
import Schemas from '../schemas/registry.js';
import { AvailabilitySchema,UsernameSchema,EmailSchema,VerifySignupSchema,ResendSignupSchema } from '../schemas/identity.schema.js';
import { parseRequest } from '../utils/validation.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import bcrypt from 'bcryptjs';
import { randomUUID,randomInt,createHmac,timingSafeEqual } from 'node:crypto';
import Mail from '../services/mail.service.js';
import JWT from '../middlewares/jwt-tokenization.middleware.js';
const TTL=10*60*1000;
export const hashCode=(id,code)=>createHmac('sha256',getEnv('EMAIL_CODE_SECRET')).update(`${id}:${code}`).digest('hex');
async function checkUser(username,email){
 const existing=await Models.User.findOne({paranoid:false,where:{[Op.or]:[{username},{email}]}});
 if(existing)throw new errors.ConflictException('Username or email already exists');
}
class RegistrationController {
 async availability(req,res,next){try{
  const {field,value}=parseRequest(AvailabilitySchema,req.body);
  const normalized=parseRequest(field==='username'?UsernameSchema:EmailSchema,value);
  const existing=await Models.User.findOne({paranoid:false,where:{[field]:normalized,...(req.auth?{id:{[Op.ne]:req.auth.id}}:{})},attributes:['id']});
  return res.json(utils.helpers.structurize_response(true,'Availability checked',{field,value:normalized,available:!existing}));
 }catch(e){next(e);}}
 async begin(req,res,next){try{
  const input=parseRequest(Schemas.RegisterUserSchema,req.body);
  input.username=parseRequest(UsernameSchema,input.username);input.email=parseRequest(EmailSchema,input.email);
  await checkUser(input.username,input.email);
  const id=randomUUID();const code=String(randomInt(100000,1000000));
  const row=await PendingSignup.create({id,name:input.name,username:input.username,email:input.email,
   password_hash:await bcrypt.hash(input.password,12),code_hash:hashCode(id,code),expires_at:new Date(Date.now()+TTL),sent_at:new Date(),attempts:0,resends:0});
  let delivery;
  try{delivery=await Mail.sendVerification(row.email,code,id);}catch(e){await row.destroy();throw e;}
  return res.status(202).json(utils.helpers.structurize_response(true,'Verification code prepared',{verification_id:id,email:row.email,expires_in:600,...delivery}));
 }catch(e){next(e);}}
 async verify(req,res,next){try{
  const {verification_id,code}=parseRequest(VerifySignupSchema,req.body);
  const result=await Models.User.sequelize.transaction(async transaction=>{
   const row=await PendingSignup.findByPk(verification_id,{transaction,lock:transaction.LOCK.UPDATE});
   if(!row || row.expires_at.getTime()<=Date.now())return {failure:'Code expired. Request a new code'};
   if(row.attempts>=5)return {failure:'Too many incorrect codes. Request a new code'};
   const expected=Buffer.from(row.code_hash,'hex');const supplied=Buffer.from(hashCode(row.id,code),'hex');
   if(expected.length!==supplied.length || !timingSafeEqual(expected,supplied)){
    await row.update({attempts:row.attempts+1},{transaction});return {failure:'Incorrect verification code'};
   }
   await checkUser(row.username,row.email);
   const user=await Models.User.create({name:row.name,username:row.username,email:row.email,password:row.password_hash,email_verified_at:new Date()},{transaction});
   const data=Schemas.UserSchema.parse(user.toJSON());const token=JWT.generate(data);
   await row.destroy({transaction});return {data:{...data,token}};
  });
  if(result.failure)throw new errors.ValidationException(result.failure);
  return res.status(201).json(utils.helpers.structurize_response(true,'Account verified and signed in',result.data));
 }catch(e){next(e);}}
 async resend(req,res,next){try{
  const {verification_id}=parseRequest(ResendSignupSchema,req.body);const code=String(randomInt(100000,1000000));
  const row=await PendingSignup.sequelize.transaction(async transaction=>{
   const pending=await PendingSignup.findByPk(verification_id,{transaction,lock:transaction.LOCK.UPDATE});
   if(!pending)throw new errors.NotFoundException('Verification request not found');
   if(pending.resends>=3)throw new errors.ValidationException('Resend limit reached. Start registration again');
   if(Date.now()-pending.sent_at.getTime()<60000)throw new errors.TooManyRequestsException('Wait one minute before requesting another code');
   await pending.update({code_hash:hashCode(pending.id,code),expires_at:new Date(Date.now()+TTL),sent_at:new Date(),attempts:0,resends:pending.resends+1},{transaction});return pending;
  });
  const delivery=await Mail.sendVerification(row.email,code,row.id);
  return res.json(utils.helpers.structurize_response(true,'Verification code resent',{verification_id:row.id,email:row.email,expires_in:600,...delivery}));
 }catch(e){next(e);}}
}
export default new RegistrationController();
