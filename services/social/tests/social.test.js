import { test, before, after, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
Object.assign(process.env, {
    PROJECT_NAME:'social-test', PROJECT_TITLE:'Social Test', PORT:'3102', ENVIRONMENT:'test',
    API_PREFIX:'/api/v1', API_VERSION:'1', IDENTITY_URL:'http://identity.test',
    DB_DIALECT:'mysql', DB_HOST:'127.0.0.1', DB_PORT:'3306', DB_NAME:'unused',
    DB_USER:'unused', DB_PASSWORD:'', DB_LOGGING:'false', ALLOWED_ORIGINS:'http://allowed.test',
});
const {default:app}=await import('../init.js');
const {default:Models}=await import('../models/registry.js');
const {default:sequelize}=await import('../config/sequelize.js');
const nativeFetch=globalThis.fetch;
let server, base;
before(async()=>{
    server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    base='http://127.0.0.1:'+server.address().port;
});
beforeEach(()=>transaction());
afterEach(()=>mock.restoreAll());
after(async()=>{await new Promise(resolve=>server.close(resolve));await sequelize.close();});
function identity(id=1,status=200){
    mock.method(globalThis,'fetch',async(url,options)=>{
        assert.equal(String(url),'http://identity.test/api/v1/auth/me');
        assert.equal(options.headers.Authorization,'Bearer test-token');
        return new Response(JSON.stringify({success:true,data:{id,status:true,username:'tester',name:'Tester'}}),{status});
    });
}
async function request(path,method='GET',body,token=true){
    const r=await nativeFetch(base+'/api/v1'+path,{
        method,headers:{...(token?{Authorization:'Bearer test-token'}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},
        ...(body!==undefined?{body:JSON.stringify(body)}:{}),
    });
    return {status:r.status,body:await r.json()};
}
function record(extra={}){
    const data={id:3,creator_id:1,content:'Hello',status:true,created_at:new Date(),updated_at:new Date(),deleted_at:null,...extra};
    return {...data,reload:async()=>{},toJSON:()=>({...data}),update:async values=>{Object.assign(data,values);return {reload:async()=>{},toJSON:()=>({...data})};},destroy:async()=>{}};
}
test('me returns verified identity',async()=>{identity();const r=await request('/me');assert.equal(r.status,200);assert.equal(r.body.data.id,1);});
test('missing token is 401',async()=>{assert.equal((await request('/posts','POST',{content:'Hi'},false)).status,401);});
test('revoked token remains 401',async()=>{identity(1,401);assert.equal((await request('/posts')).status,401);});
test('Identity network failure is 503',async()=>{mock.method(globalThis,'fetch',async()=>{throw new Error('offline');});assert.equal((await request('/posts')).status,503);});
test('invalid Identity payload fails closed',async()=>{identity('bad');assert.equal((await request('/posts')).status,503);});
test('post creation uses authenticated creator',async()=>{
    identity();mock.method(Models.Post,'create',async data=>{assert.deepEqual(data,{content:'Hello',creator_id:1});return {...record(),reload:async()=>{}};});
    const r=await request('/posts','POST',{content:' Hello '});assert.equal(r.status,201);assert.equal(r.body.data.creator_id,1);
});
test('client cannot supply ownership',async()=>{identity();assert.equal((await request('/posts','POST',{content:'Hello',creator_id:2})).status,422);});
for(const method of ['PATCH','DELETE']){
    test(method+' rejects another user before mutation',async()=>{
        identity(2);const p=record();p.update=p.destroy=()=>assert.fail('unauthorized mutation');mock.method(Models.Post,'findOne',async()=>p);
        assert.equal((await request('/posts/3',method,method==='PATCH'?{content:'Changed'}:undefined)).status,403);
    });
    test(method+' permits owner',async()=>{
        identity();mock.method(Models.Post,'findOne',async()=>record());assert.equal((await request('/posts/3',method,method==='PATCH'?{content:'Changed'}:undefined)).status,200);
    });
}
test('other users can read a post',async()=>{identity(2);mock.method(Models.Post,'findOne',async()=>record());assert.equal((await request('/posts/3')).status,200);});
test('invalid pagination is 422',async()=>{identity();assert.equal((await request('/posts?page=0')).status,422);});
test('pagination passes limit and offset',async()=>{
    identity();mock.method(Models.Post,'findAndCountAll',async options=>{assert.equal(options.limit,1);assert.equal(options.offset,1);return {count:2,rows:[record()]};});
    const r=await request('/posts?page=2&limit=1');assert.equal(r.status,200);assert.equal(r.body.pagination.total,2);
});
function transaction(){const tx={LOCK:{UPDATE:'UPDATE'}};mock.method(sequelize,'transaction',async callback=>callback(tx));return tx;}
test('comment validates parent and assigns path and authenticated IDs',async()=>{
    identity(2);const tx=transaction();mock.method(Models.Post,'findOne',async options=>{assert.equal(options.where.id,3);assert.equal(options.transaction,tx);assert.equal(options.lock,'UPDATE');return record();});
    mock.method(Models.Comment,'create',async(data,options)=>{assert.deepEqual(data,{post_id:3,creator_id:2,content:'Comment'});assert.equal(options.transaction,tx);return record(data);});
    const r=await request('/posts/3/comments','POST',{content:'Comment'});assert.equal(r.status,201);assert.equal(r.body.data.post_id,3);
});
test('missing or soft-deleted parent is 404 without insert',async()=>{
    identity();transaction();mock.method(Models.Post,'findOne',async()=>null);mock.method(Models.Comment,'create',()=>assert.fail('unexpected insert'));
    assert.equal((await request('/posts/999/comments','POST',{content:'Hello'})).status,404);
});
test('invalid parent ID is 422',async()=>{identity();assert.equal((await request('/posts/no/comments','POST',{content:'Hello'})).status,422);});
test('comment rejects empty content and supplied IDs',async()=>{
    identity();for(const body of [{content:' '},{content:'Hi',post_id:4},{content:'Hi',creator_id:2}])assert.equal((await request('/posts/3/comments','POST',body)).status,422);
});


test('comment listing always scopes to URL post even with filters',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findAndCountAll',async options=>{
        const scopes=options.where[Object.getOwnPropertySymbols(options.where)[0]];
        assert.deepEqual(scopes[0],{post_id:3});return {count:1,rows:[record({post_id:3})]};
    });
    const r=await request('/posts/3/comments?search=Hello&status=true');assert.equal(r.status,200);assert.equal(r.body.data[0].post_id,3);
});
for(const method of ['GET','PATCH','DELETE']){
    test(method+' cannot access a comment through another post',async()=>{
        identity();mock.method(Models.Post,'findOne',async()=>record());
        mock.method(Models.Comment,'findOne',async options=>{assert.deepEqual(options.where,{post_id:3,id:8});return null;});
        assert.equal((await request('/posts/3/comments/8',method,method==='PATCH'?{content:'Updated'}:undefined)).status,404);
    });
}
for(const method of ['PATCH','DELETE']){
    test('comment '+method+' rejects non-owner',async()=>{
        identity(2);mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'findOne',async()=>record({post_id:3}));
        assert.equal((await request('/posts/3/comments/3',method,method==='PATCH'?{content:'Updated'}:undefined)).status,403);
    });
    test('comment '+method+' permits owner',async()=>{
        identity();mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'findOne',async()=>record({post_id:3}));
        assert.equal((await request('/posts/3/comments/3',method,method==='PATCH'?{content:'Updated'}:undefined)).status,200);
    });
}
test('comment read allows non-owner',async()=>{
    identity(2);mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'findOne',async()=>record({post_id:3}));
    assert.equal((await request('/posts/3/comments/3')).status,200);
});
test('deleted parent prevents comment listing',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>null);mock.method(Models.Comment,'findAndCountAll',()=>assert.fail('queried comments'));
    assert.equal((await request('/posts/3/comments')).status,404);
});
test('serialization failure escapes transaction before commit',async()=>{
    identity();let rolledBack=false,committed=false;
    mock.method(sequelize,'transaction',async callback=>{try{const data=await callback({LOCK:{UPDATE:'UPDATE'}});committed=true;return data;}catch(e){rolledBack=true;throw e;}});
    mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'create',async()=>record({post_id:3,content:42}));
    assert.equal((await request('/posts/3/comments','POST',{content:'Hi'})).status,500);assert.equal(rolledBack,true);assert.equal(committed,false);
});
test('multiple parent mappings validate relationships',async()=>{
    const {default:Base}=await import('../controllers/base.controller.js');const seen=[];
    const parent={name:'Parent',findOne:async options=>{seen.push(options.where);return {};}};
    const c=new Base(Models.Comment,{parents:[{param:'group_id',field:'group_id',model:parent},{param:'post_id',field:'post_id',model:parent,scope:{group_id:'group_id'}}]});
    assert.deepEqual(await c.getScope({params:{group_id:'2',post_id:'3'}}),{group_id:2,post_id:3});
    assert.deepEqual(seen,[{id:2},{id:3,group_id:2}]);
});
