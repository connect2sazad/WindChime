import { test,afterEach,mock } from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env,{PROJECT_NAME:'test',PROJECT_TITLE:'Test',PORT:'3101',ENVIRONMENT:'test',API_PREFIX:'/api/v1',API_VERSION:'1',JWT_SECRET_KEY:'test-only-secret',JWT_EXPIRES_IN:'1h',LOGIN_LIMIT:'100',DB_DIALECT:'mysql',DB_HOST:'127.0.0.1',DB_PORT:'3306',DB_NAME:'unused',DB_USER:'unused',DB_PASSWORD:'',ALLOWED_ORIGINS:'http://allowed.example',EMAIL_CODE_SECRET:'test-only-code-signing-secret'});
const {default:Registration,hashCode}=await import('../controllers/registration.controller.js');
const {default:Profile}=await import('../controllers/profile.controller.js');
const {default:Models}=await import('../models/registry.js');
const {default:Pending}=await import('../models/pending-signup.model.js');
const {default:Mail}=await import('../services/mail.service.js');
const {default:Avatar,AVATAR_DIR}=await import('../controllers/avatar.controller.js');
const {default:sharp}=await import('sharp');
const {readFile,unlink}=await import('node:fs/promises');
const {default:path}=await import('node:path');
const id='11111111-1111-4111-8111-111111111111';
afterEach(()=>mock.restoreAll());
function row(extra={}){const obj={id,name:'Tester',username:'tester',email:'test@example.com',password_hash:'hashed',code_hash:hashCode(id,'123456'),expires_at:new Date(Date.now()+600000),sent_at:new Date(Date.now()-120000),attempts:0,resends:0,...extra};obj.update=async values=>Object.assign(obj,values);obj.destroy=async()=>{obj.destroyed=true;};return obj;}
async function invoke(controller,method,req){let body,status=200,error;const res={status(value){status=value;return this;},json(value){body=value;return this;}};await controller[method](req,res,e=>{error=e;});return {body,status,error};}
function tx(){mock.method(Models.User.sequelize,'transaction',async callback=>callback({LOCK:{UPDATE:'UPDATE'}}));}
test('profile picture is decoded resized and saved only on authenticated user',async()=>{
 tx();let filename;mock.method(Models.User,'findByPk',async id=>{assert.equal(id,7);return {status:true,avatar_filename:null,update:async values=>{filename=values.avatar_filename;}};});
 const buffer=await sharp({create:{width:30,height:20,channels:3,background:'#183b44'}}).png().toBuffer();
 try{const result=await invoke(Avatar,'set',{auth:{id:7},body:{id:8},file:{buffer}});assert.equal(result.error,undefined);assert.equal(result.body.data.avatar_version,filename);const info=await sharp(await readFile(path.join(AVATAR_DIR,filename))).metadata();assert.equal(info.format,'webp');assert.equal(info.width,512);assert.equal(info.height,512);}finally{if(filename)await unlink(path.join(AVATAR_DIR,filename));}
});
test('invalid image bytes never update the user',async()=>{
 mock.method(Models.User,'findByPk',()=>assert.fail('Unexpected database mutation'));const result=await invoke(Avatar,'set',{auth:{id:7},file:{buffer:Buffer.from('not an image')}});assert.equal(result.error.statusCode,422);
});
test('correct code creates a verified user and consumes pending signup',async()=>{
 tx();const signup=row();mock.method(Pending,'findByPk',async()=>signup);mock.method(Models.User,'findOne',async()=>null);
 mock.method(Models.User,'create',async values=>{assert.equal(values.password,'hashed');assert.ok(values.email_verified_at instanceof Date);return {toJSON:()=>({id:2,name:values.name,username:values.username,email:values.email,status:true,bio:'',email_verified_at:values.email_verified_at,created_at:new Date(),updated_at:new Date()})};});
 const r=await invoke(Registration,'verify',{body:{verification_id:id,code:'123456'}});assert.equal(r.error,undefined);assert.equal(r.status,201);assert.equal(signup.destroyed,true);assert.equal(typeof r.body.data.token.token,'string');
});
test('incorrect code increments persistent attempts and creates no account',async()=>{
 tx();const signup=row();mock.method(Pending,'findByPk',async()=>signup);mock.method(Models.User,'create',()=>assert.fail('Unverified account created'));
 const r=await invoke(Registration,'verify',{body:{verification_id:id,code:'999999'}});assert.equal(r.error.statusCode,422);assert.equal(signup.attempts,1);assert.equal(signup.destroyed,undefined);
});
test('expired or exhausted code cannot create an account',async()=>{
 tx();mock.method(Pending,'findByPk',async()=>row({expires_at:new Date(Date.now()-1)}));const r=await invoke(Registration,'verify',{body:{verification_id:id,code:'123456'}});assert.equal(r.error.statusCode,422);
});
test('availability normalizes username and only exposes boolean',async()=>{
 mock.method(Models.User,'findOne',async options=>{assert.equal(options.where.username,'tester');return {id:2};});
 const r=await invoke(Registration,'availability',{body:{field:'username',value:' Tester '}});assert.equal(r.body.data.available,false);assert.equal(r.body.data.id,undefined);
});
test('another user profile does not expose email',async()=>{
 mock.method(Models.User,'findByPk',async()=>({id:2,status:true,name:'Tester',username:'tester',email:'private@example.com',created_at:new Date(),bio:'Hello'}));
 const r=await invoke(Profile,'get',{params:{id:'2'},auth:{id:1}});assert.equal(r.body.data.email,undefined);assert.equal(r.body.data.bio,'Hello');
});
test('profile editing rejects email, ownership and status changes',async()=>{
 const r=await invoke(Profile,'update',{auth:{id:1},body:{email:'other@example.com',status:false}});assert.equal(r.error.statusCode,422);
});
test('resend waits a minute and never exposes the code in JSON',async()=>{
 tx();mock.method(Pending,'findByPk',async()=>row({sent_at:new Date()}));mock.method(Mail,'sendVerification',()=>assert.fail('Unexpected email'));
 const r=await invoke(Registration,'resend',{body:{verification_id:id}});assert.equal(r.error.statusCode,429);
});
