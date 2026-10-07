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
