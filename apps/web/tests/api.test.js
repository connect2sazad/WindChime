import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, SOCIAL_API } from '../src/api/request.js';
import { getComments } from '../src/api/comments.js';
afterEach(()=>mock.restoreAll());
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
 const {getReactors}=await import('../src/api/reactions.js');
 mock.method(globalThis,'fetch',async url=>{
  assert.match(url,/type=love/);assert.match(url,/page=2/);
  return new Response(JSON.stringify({success:true,data:[{id:4,creator_id:2,type:'love'}],pagination:{total:1,has_next_page:false}}));
 });
 assert.equal((await getReactors('test',3,'love',2)).data[0].type,'love');
});
test('display-user lookup excludes private fields from its result',async()=>{
 const {getDisplayUser}=await import('../src/api/users.js');
 mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({success:true,data:{id:2,name:'Tester',username:'tester',email:'private@example.com',status:true}})));
 assert.deepEqual(await getDisplayUser('test',2),{id:2,name:'Tester',username:'tester'});
});

test('comment reaction API sends the chosen type rather than always like',async()=>{
 const {reactToComment}=await import('../src/api/comments.js');
 mock.method(globalThis,'fetch',async(url,options)=>{
  assert.match(url,/posts\/3\/comments\/8\/reactions$/);assert.equal(options.method,'PUT');
  assert.deepEqual(JSON.parse(options.body),{type:'love'});
  return new Response(JSON.stringify({success:true,data:{id:1,type:'love'}}));
 });
 await reactToComment('test',3,8,false,'love');
});
test('comment reaction removal sends DELETE without a body',async()=>{
 const {reactToComment}=await import('../src/api/comments.js');
 mock.method(globalThis,'fetch',async(url,options)=>{
  assert.equal(options.method,'DELETE');assert.equal(options.body,undefined);
  return new Response(null,{status:204});
 });
 await reactToComment('test',3,8,true);
});
test('comment reactor API includes reaction segregation',async()=>{
 const {getCommentReactors}=await import('../src/api/comments.js');
 mock.method(globalThis,'fetch',async url=>{
  assert.match(url,/comments\/8\/reactions\/people/);assert.match(url,/type=laugh/);
  return new Response(JSON.stringify({success:true,data:[],pagination:{total:0,has_next_page:false}}));
 });
 assert.deepEqual((await getCommentReactors('test',3,8,'laugh')).data,[]);
});
