import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, SOCIAL_API } from '../src/shared/api/request.js';
import { getComments } from '../src/modules/comments/api/index.js';
import { updatePost,deletePost } from '../src/modules/posts/api/index.js';
import { getPosts,getPersonalizedFeed } from '../src/modules/posts/api/index.js';
import { getProfileByUsername } from '../src/modules/profiles/api/index.js';
import { listConnections } from '../src/modules/connections/api/index.js';
import { isBackdropClick } from '../src/shared/utils/dialog.js';
import { sendMessage,getMessages,startConversation,getConversations,forwardMessage,deleteMessage,reactToMessage } from '../src/modules/messages/api/index.js';
afterEach(()=>mock.restoreAll());
test('friend search is encoded and sent with the connection list',async()=>{mock.method(globalThis,'fetch',async url=>{assert.ok(String(url).endsWith('/connections?view=friends&page=1&search=Sazad%20Ahemad'));return new Response(JSON.stringify({success:true,data:[]}));});await listConnections('test','friends',1,undefined,'Sazad Ahemad');});
test('backdrop detection ignores clicks inside dialog padding and child controls',()=>{const dialog={getBoundingClientRect:()=>({left:100,right:300,top:100,bottom:300})};assert.equal(isBackdropClick({target:dialog,currentTarget:dialog,clientX:50,clientY:200}),true);assert.equal(isBackdropClick({target:dialog,currentTarget:dialog,clientX:150,clientY:200}),false);assert.equal(isBackdropClick({target:{},currentTarget:dialog,clientX:50,clientY:200}),false);});
test('chat reply carries its parent ID',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(JSON.parse(options.body).reply_to_id,5);return new Response(JSON.stringify({success:true,data:{id:9}}));});await sendMessage('test',2,'Reply','nonce',{replyTo:5});});
test('forward carries target friend and retry ID, never copies media on the client',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.ok(String(url).endsWith('/conversations/2/messages/5/forward'));assert.deepEqual(JSON.parse(options.body),{recipient_id:3,client_message_id:'nonce'});return new Response(JSON.stringify({success:true,data:{conversation_id:3}}));});await forwardMessage('test',2,5,3,'nonce');});
test('message delete and reaction removal use scoped DELETE requests',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.method,'DELETE');assert.ok(String(url).includes('/conversations/2/messages/5'));return new Response(JSON.stringify({success:true,data:{id:5}}));});await deleteMessage('test',2,5);await reactToMessage('test',2,5,null);});
test('DM media uses FormData without overriding its boundary',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.ok(options.body instanceof FormData);assert.equal(options.headers['Content-Type'],undefined);assert.equal(options.body.get('client_message_id'),'nonce');return new Response(JSON.stringify({success:true,data:{id:9}}));});assert.equal((await sendMessage('test',2,'','nonce',{files:[new Blob(['test'],{type:'image/png'})]})).id,9);});
test('DM post sharing sends the original post ID',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.deepEqual(JSON.parse(options.body),{content:'',client_message_id:'nonce',shared_post_id:3});return new Response(JSON.stringify({success:true,data:{id:9}}));});await sendMessage('test',2,'','nonce',{postId:3});});
test('conversation search is encoded and sent to the backend',async()=>{mock.method(globalThis,'fetch',async url=>{assert.ok(String(url).endsWith('/conversations?page=1&search=Sazad%20Ahemad'));return new Response(JSON.stringify({success:true,data:[]}));});await getConversations('test',1,undefined,'Sazad Ahemad');});
test('DM sends authenticated text and preserves the retry UUID',async()=>{
 const id=crypto.randomUUID();mock.method(globalThis,'fetch',async(url,options)=>{assert.ok(String(url).endsWith('/conversations/4/messages'));assert.equal(options.headers.Authorization,'Bearer test');assert.deepEqual(JSON.parse(options.body),{content:'Hello',client_message_id:id});return new Response(JSON.stringify({success:true,data:{id:8,content:'Hello'}}));});assert.equal((await sendMessage('test',4,'Hello',id)).id,8);
});
test('DM history requests new messages with a cursor',async()=>{
 mock.method(globalThis,'fetch',async url=>{assert.ok(String(url).endsWith('/conversations/4/messages?after=8'));return new Response(JSON.stringify({success:true,data:[]}));});assert.deepEqual((await getMessages('test',4,{after:8})).data,[]);
});
test('nonfriend DM denial is shown without treating it as a logout',async()=>{
 mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:false,message:'Only accepted friends can message each other'}),{status:403}));await assert.rejects(()=>startConversation('test',2),error=>error.status===403&&error.message.includes('friends'));
});
test('username profile lookup uses the username endpoint',async()=>{
 mock.method(globalThis,'fetch',async url=>{assert.ok(String(url).endsWith('/profiles/connect2sazad'));return new Response(JSON.stringify({success:true,data:{id:2,username:'connect2sazad'}}));});assert.equal((await getProfileByUsername('test','connect2sazad')).id,2);
});
test('feed pagination requests the selected page',async()=>{
 mock.method(globalThis,'fetch',async url=>{assert.equal(url,SOCIAL_API+'/posts?page=2&limit=10&status=true');return new Response(JSON.stringify({success:true,data:[],pagination:{page:2}}));});assert.equal((await getPosts('test',undefined,2)).pagination.page,2);
});
test('editing sends caption only and requires matching returned post',async()=>{
 mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,SOCIAL_API+'/posts/3');assert.equal(options.method,'PATCH');assert.deepEqual(JSON.parse(options.body),{content:'Updated'});return new Response(JSON.stringify({success:true,data:{id:3,content:'Updated'}}));});assert.equal((await updatePost('test',3,'Updated')).content,'Updated');
});
test('delete uses protected post endpoint and propagates ownership rejection',async()=>{
 mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(url,SOCIAL_API+'/posts/3');assert.equal(options.method,'DELETE');assert.equal(options.headers.Authorization,'Bearer test');assert.equal(options.body,undefined);return new Response(JSON.stringify({success:false,message:'Forbidden'}),{status:403});});await assert.rejects(()=>deletePost('test',3),error=>error.status===403);
});
test('request preserves caller cancellation and JSON payload',async()=>{
 const controller=new AbortController();
 mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(url,SOCIAL_API+'/test');assert.equal(options.headers.Authorization,'Bearer test');
  assert.deepEqual(JSON.parse(options.body),{content:'Hello'});
  controller.abort();assert.equal(options.signal.aborted,true);
  return new Response(JSON.stringify({success:true,data:{id:1}}));
 });
 assert.equal((await apiRequest(SOCIAL_API,'/test',{token:'test',method:'POST',body:{content:'Hello'},signal:controller.signal})).data.id,1);
});
test('204 response never attempts JSON parsing',async()=>{
 mock.method(globalThis,'fetch',async()=>new Response(null,{status:204}));
 assert.equal(await apiRequest(SOCIAL_API,'/test',{method:'DELETE'}),null);
});
test('malformed server response produces readable error',async()=>{
 mock.method(globalThis,'fetch',async()=>new Response('bad gateway',{status:502}));
 await assert.rejects(()=>apiRequest(SOCIAL_API,'/test'),e=>e.status===502&&/unreadable/.test(e.message));
});
test('rate limits retain HTTP status',async()=>{
 mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:false}),{status:429}));
 await assert.rejects(()=>apiRequest(SOCIAL_API,'/test'),e=>e.status===429&&/Too many/.test(e.message));
});
test('comments reject missing pagination contract',async()=>{
 mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:true,data:[]})));
 await assert.rejects(()=>getComments('test',3),/Unexpected comments/);
});

test('authenticated 401 notifies the app without exposing token in errors',async()=>{
 const oldWindow=globalThis.window;
 const events=[];
 globalThis.window={dispatchEvent:event=>events.push(event)};
 try {
  mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:false,message:'Expired'}),{status:401}));
  await assert.rejects(()=>apiRequest(SOCIAL_API,'/test',{token:'test-token'}),e=>e.status===401);
  assert.equal(events.length,1);assert.equal(events[0].type,'windchime:session-expired');assert.equal(events[0].detail,'test-token');
 }finally{if(oldWindow===undefined)delete globalThis.window;else globalThis.window=oldWindow;}
});

test('reactor API passes type and page filters',async()=>{
 const {getReactors}=await import('../src/modules/reactions/api/index.js');
 mock.method(globalThis,'fetch',async url=>{
  assert.match(url,/type=love/);assert.match(url,/page=2/);
  return new Response(JSON.stringify({success:true,data:[{id:4,creator_id:2,type:'love'}],pagination:{total:1,has_next_page:false}}));
 });
 assert.equal((await getReactors('test',3,'love',2)).data[0].type,'love');
});
test('display-user lookup excludes private fields from its result',async()=>{
 const {getDisplayUser}=await import('../src/modules/profiles/api/index.js');
 mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:true,data:{id:2,name:'Tester',username:'tester',email:'private@example.com',status:true}})));
 assert.deepEqual(await getDisplayUser('test',2),{id:2,name:'Tester',username:'tester'});
});

test('comment reaction API sends the chosen type rather than always like',async()=>{
 const {reactToComment}=await import('../src/modules/comments/api/index.js');
 mock.method(globalThis,'fetch',async(url,options)=>{
  assert.match(url,/posts\/3\/comments\/8\/reactions$/);assert.equal(options.method,'PUT');
  assert.deepEqual(JSON.parse(options.body),{type:'love'});
  return new Response(JSON.stringify({success:true,data:{id:1,type:'love'}}));
 });
 await reactToComment('test',3,8,false,'love');
});
test('comment reaction removal sends DELETE without a body',async()=>{
 const {reactToComment}=await import('../src/modules/comments/api/index.js');
 mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(options.method,'DELETE');assert.equal(options.body,undefined);
  return new Response(null,{status:204});
 });
 await reactToComment('test',3,8,true);
});
test('comment reactor API includes reaction segregation',async()=>{
 const {getCommentReactors}=await import('../src/modules/comments/api/index.js');
 mock.method(globalThis,'fetch',async url=>{
  assert.match(url,/comments\/8\/reactions\/people/);assert.match(url,/type=laugh/);
  return new Response(JSON.stringify({success:true,data:[],pagination:{total:0,has_next_page:false}}));
 });
 assert.deepEqual((await getCommentReactors('test',3,8,'laugh')).data,[]);
});

test('registration starts verification without logging in',async()=>{
 const {register}=await import('../src/modules/identity/api/index.js');let calls=0;
 mock.method(globalThis,'fetch',async(url,options)=>{calls++;assert.match(url,/auth\/register$/);assert.equal(JSON.parse(options.body).username,'newmember');return new Response(JSON.stringify({success:true,data:{verification_id:'test-verification-id',email:'new@example.com'}}),{status:202});});
 const result=await register('New Member','newmember','new@example.com','Secret@123','Secret@123');assert.equal(result.verification_id,'test-verification-id');assert.equal(calls,1);
});
test('verification returns a session after a correct code',async()=>{
 const {verifyRegistration}=await import('../src/modules/identity/api/index.js');
 mock.method(globalThis,'fetch',async(url,options)=>{assert.match(url,/register\/verify$/);assert.deepEqual(JSON.parse(options.body),{verification_id:'test-id',code:'123456'});return new Response(JSON.stringify({success:true,data:{id:2,name:'New Member',token:{token:'test-token'}}}));});
 const result=await verifyRegistration('test-id','123456');assert.equal(result.token,'test-token');assert.equal(result.user.id,2);
});
test('uploads preserve FormData without manually setting Content-Type',async()=>{
 const form=new FormData();form.append('content','Caption');
 mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.body,form);assert.equal(options.headers['Content-Type'],undefined);return new Response(JSON.stringify({success:true,data:{id:1}}));});
 await apiRequest(SOCIAL_API,'/posts',{token:'test',method:'POST',body:form});
});

test('personalized feed sends page and selected mode',async()=>{mock.method(globalThis,'fetch',async url=>{assert.equal(url,SOCIAL_API+'/feed?page=2&limit=10&mode=network');return new Response(JSON.stringify({success:true,data:[]}));});await getPersonalizedFeed('test',undefined,2,'network');});

test('protected media bypasses cache and rejects redirects',async()=>{mock.method(globalThis,'fetch',async(url,options)=>{assert.equal(options.headers.Authorization,'Bearer test');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');return new Response(new Blob(['video'],{type:'video/mp4'}));});const blob=await apiRequest(SOCIAL_API,'/posts/3/media/4',{token:'test',responseType:'blob'});assert.equal(blob.type,'video/mp4');});
