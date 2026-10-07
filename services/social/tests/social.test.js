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
    mock.method(Models.Comment,'create',async(data,options)=>{assert.deepEqual(data,{post_id:3,creator_id:2,content:'Comment',parent_id:null});assert.equal(options.transaction,tx);return record(data);});
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
        assert.deepEqual(scopes[0],{post_id:3,parent_id:null});return {count:1,rows:[record({post_id:3})]};
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


test('reply creation validates and locks same-post top-level parent',async()=>{
    identity(2);mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>{
        assert.deepEqual(options.where,{id:6,post_id:3});assert.equal(options.lock,'UPDATE');assert.ok(options.transaction);
        return record({id:6,post_id:3,parent_id:null});
    });
    mock.method(Models.Comment,'create',async data=>{assert.deepEqual(data,{content:'Reply',parent_id:6,post_id:3,creator_id:2});return record(data);});
    assert.equal((await request('/posts/3/comments','POST',{content:'Reply',parent_id:6})).status,201);
});
test('missing, wrong-post, deleted or nested parent cannot create reply',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>{assert.deepEqual(options.where,{id:6,post_id:3});return null;});
    mock.method(Models.Comment,'create',()=>assert.fail('invalid reply inserted'));
    assert.equal((await request('/posts/3/comments','POST',{content:'Reply',parent_id:6})).status,404);
});
test('reply query scopes pagination to the requested parent',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'findOne',async()=>record({id:6,post_id:3,parent_id:null}));
    mock.method(Models.Comment,'findAndCountAll',async options=>{
        const [scope]=options.where[Object.getOwnPropertySymbols(options.where)[0]];
        assert.deepEqual(scope,{post_id:3,parent_id:6});assert.equal(options.limit,1);assert.equal(options.offset,1);
        return {count:2,rows:[record({post_id:3,parent_id:6})]};
    });
    const r=await request('/posts/3/comments?parent_id=6&page=2&limit=1');assert.equal(r.status,200);assert.equal(r.body.data[0].parent_id,6);
});
test('malformed reply filters return 422',async()=>{
    identity();for(const q of ['parent_id=','parent_id=null','parent_id=-1','parent_id=1.5','parent_id=abc','parent_id=6&parent_id=7'])assert.equal((await request('/posts/3/comments?'+q)).status,422);
});
test('missing reply-list parent returns 404',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());mock.method(Models.Comment,'findOne',async()=>null);
    assert.equal((await request('/posts/3/comments?parent_id=6')).status,404);
});
test('parent cannot be reassigned by PATCH',async()=>{
    identity();assert.equal((await request('/posts/3/comments/7','PATCH',{content:'Moved',parent_id:8})).status,422);
});
test('reply single view hides reply after parent deletion',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>options.where.id===7?record({id:7,post_id:3,parent_id:6}):null);
    assert.equal((await request('/posts/3/comments/7')).status,404);
});

test('real model accepts a top-level comment with null parent',async()=>{
    await Models.Comment.build({post_id:3,creator_id:1,parent_id:null,content:'Top-level'}).validate();
});

test('reply to a reply returns 422 without inserting', async () => {
    identity();
    mock.method(Models.Post, 'findOne', async () => record());
    mock.method(Models.Comment, 'findOne', async () =>
        record({ id: 6, post_id: 3, parent_id: 2 })
    );
    mock.method(Models.Comment, 'create', () =>
        assert.fail('A nested reply must not be inserted')
    );

    const result = await request('/posts/3/comments', 'POST', {
        content: 'Nested reply',
        parent_id: 6,
    });

    assert.equal(result.status, 422);
    assert.match(result.body.message, /Replies to replies are not supported/);
});

test('comment reactions reject a comment under the wrong post URL',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>{assert.deepEqual(options.where,{id:8,post_id:3});return null;});
    mock.method(Models.CommentReaction,'create',()=>assert.fail('reaction must not be inserted'));
    assert.equal((await request('/posts/3/comments/8/reactions','PUT',{type:'like'})).status,404);
});
test('comment reaction validates post without assigning post_id to reaction',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async()=>record({id:8,post_id:3,parent_id:null}));
    mock.method(Models.Comment,'findByPk',async()=>record({id:8,post_id:3,parent_id:null}));
    mock.method(Models.CommentReaction,'findOne',async()=>null);
    mock.method(Models.CommentReaction,'create',async values=>{
        assert.deepEqual(values,{comment_id:8,creator_id:1,type:'love'});
        return record({...values,id:10});
    });
    assert.equal((await request('/posts/3/comments/8/reactions','PUT',{type:'love'})).status,201);
});
test('reaction on a reply with deleted parent is rejected',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>options.where.id===8?record({id:8,post_id:3,parent_id:6}):null);
    mock.method(Models.Comment,'findByPk',async()=>record({id:8,post_id:3,parent_id:6}));
    assert.equal((await request('/posts/3/comments/8/reactions','PUT',{type:'like'})).status,404);
});
test('reaction resource rejects unsupported status filter without SQL',async()=>{
    identity();assert.equal((await request('/posts/3/reactions?status=true')).status,422);
});
test('validation-only parent does not add an undefined child field',async()=>{
    const {default:Base}=await import('../controllers/base.controller.js');
    const parent={name:'Parent',findOne:async()=>({})};
    const c=new Base(Models.Comment,{parents:[{param:'post_id',model:parent},{param:'comment_id',field:'comment_id',model:parent,scope:{post_id:'post_id'}}]});
    assert.deepEqual(await c.getScope({params:{post_id:'3',comment_id:'8'}}),{comment_id:8});
});

const {default:Controllers}=await import('../controllers/registry.js');
const {default:Expiration}=await import('../services/friendship-expiration.service.js');
function friendship(extra={}) {
 const data={id:9,user_low_id:1,user_high_id:2,requester_id:1,status:'pending',requested_at:new Date(),accepted_at:null,created_at:new Date(),updated_at:new Date(),...extra};
 return {...data,update:async values=>Object.assign(data,values),reload:async()=>{},toJSON:()=>({...data})};
}
async function respond(id,action,value){
 mock.method(Models.Friendship,'findByPk',async()=>value);
 let result,error;
 const res={status(code){result={status:code};return this;},json(body){result.body=body;return this;}};
 await Controllers.friendship_controller.respond_friendship_request({auth:{id},respond:action,params:{friendship_id:'9'}},res,e=>{error=e;});
 return {result,error};
}
test('friendship requester cannot accept',async()=>{assert.equal((await respond(1,'accepted',friendship())).error.statusCode,403);});
test('friendship recipient accepts pending request',async()=>{
 const {result,error}=await respond(2,'accepted',friendship());assert.equal(error,undefined);assert.equal(result.body.data.status,'accepted');assert.ok(result.body.data.accepted_at);
});
test('cancellation belongs to requester',async()=>{
 const {result,error}=await respond(1,'cancelled',friendship());assert.equal(error,undefined);assert.equal(result.body.data.status,'cancelled');
});
test('recipient cannot cancel request',async()=>{assert.equal((await respond(2,'cancelled',friendship())).error.statusCode,403);});
test('overdue request cannot be accepted',async()=>{assert.equal((await respond(2,'accepted',friendship({requested_at:new Date(Date.now()-31*86400000)}))).error.statusCode,409);});
test('expiry converts requester to follower and marks expired',async()=>{
 const f=friendship({requested_at:new Date(Date.now()-31*86400000)});
 mock.method(Models.Friendship,'findByPk',async()=>f);
 mock.method(Models.Follow,'findOrCreate',async options=>{assert.deepEqual(options.where,{follower_id:1,following_id:2});return [{},true];});
 assert.equal(await Expiration.expireOne(9),true);assert.equal(f.toJSON().status,'expired');
});
test('expiry skips cancelled or fresh requests',async()=>{
 mock.method(Models.Friendship,'findByPk',async()=>friendship({status:'cancelled'}));
 mock.method(Models.Follow,'findOrCreate',()=>assert.fail('follow created'));
 assert.equal(await Expiration.expireOne(9),false);
});

test('comment summary includes replies and excludes hidden parents',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(sequelize,'query',async(sql,options)=>{
        assert.equal(options.replacements.post_id,3);
        assert.match(sql,/p.deleted_at IS NULL/);assert.match(sql,/p.post_id = c.post_id/);
        return [[{thread_id:6,top_level:'1',replies:'3'},{thread_id:8,top_level:'1',replies:'0'}],{}];
    });
    const r=await request('/posts/3/comments/summary');
    assert.equal(r.status,200);assert.equal(r.body.data.total,5);assert.equal(r.body.data.top_level,2);
    assert.equal(r.body.data.replies,3);assert.deepEqual(r.body.data.reply_counts,{'6':3,'8':0});
});

test('comment summary counts every type and identifies caller reaction',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async()=>record({id:8,post_id:3,parent_id:null}));
    mock.method(Models.Comment,'findByPk',async()=>record({id:8,post_id:3,parent_id:null}));
    mock.method(Models.CommentReaction,'findAll',async options=>{assert.deepEqual(options.where,{comment_id:8});return [{type:'like',count:'2'},{type:'love',count:'1'}];});
    mock.method(Models.CommentReaction,'findOne',async()=>null);
    const r=await request('/posts/3/comments/8/reactions/summary');
    assert.equal(r.status,200);assert.equal(r.body.data.total,3);assert.equal(r.body.data.counts.like,2);assert.equal(r.body.data.counts.love,1);assert.equal(r.body.data.my_reaction,null);
});

test('reactor list segregates types and keeps pagination',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.PostReaction,'findAndCountAll',async options=>{
        assert.deepEqual(options.where,{post_id:3,type:'love'});assert.equal(options.offset,20);assert.equal(options.limit,20);
        return {count:21,rows:[record({creator_id:2,type:'love'})]};
    });
    const r=await request('/posts/3/reactions/people?type=love&page=2&limit=20');
    assert.equal(r.status,200);assert.equal(r.body.data[0].type,'love');assert.equal(r.body.pagination.total,21);
});
test('reactor list rejects unknown reaction types',async()=>{
    identity();assert.equal((await request('/posts/3/reactions/people?type=unknown')).status,422);
});

test('comment reactor list filters each reaction within the URL post',async()=>{
    identity();mock.method(Models.Post,'findOne',async()=>record());
    mock.method(Models.Comment,'findOne',async options=>{assert.deepEqual(options.where,{id:8,post_id:3});return record({id:8,post_id:3,parent_id:null});});
    mock.method(Models.Comment,'findByPk',async()=>record({id:8,post_id:3,parent_id:null}));
    mock.method(Models.CommentReaction,'findAndCountAll',async options=>{
        assert.deepEqual(options.where,{comment_id:8,type:'angry'});assert.equal(options.limit,20);
        return {count:1,rows:[record({comment_id:8,type:'angry'})]};
    });
    const r=await request('/posts/3/comments/8/reactions/people?type=angry&limit=20');
    assert.equal(r.status,200);assert.equal(r.body.data[0].type,'angry');
});
test('comment reactor list rejects invalid type',async()=>{
    identity();assert.equal((await request('/posts/3/comments/8/reactions/people?type=other')).status,422);
});
