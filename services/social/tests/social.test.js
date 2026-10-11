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
const {Op}=await import('sequelize');
const {default:Block}=await import('../models/user-block.model.js');
const {default:ConnectionIdentity}=await import('../services/identity.service.js');
let server, base;
before(async()=>{
    server=app.listen(0,'127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    base='http://127.0.0.1:'+server.address().port;
});
beforeEach(()=>{transaction();mock.method(Block,'findAll',async()=>[]);mock.method(Block,'findOne',async()=>null);});
afterEach(()=>mock.restoreAll());
after(async()=>{await new Promise(resolve=>server.close(resolve));await sequelize.close();});
function identity(id=1,status=200,role='user'){
    mock.method(Block,'findAll',async()=>[]);mock.method(Block,'findOne',async()=>null);
    mock.method(globalThis,'fetch',async(url,options)=>{
        assert.equal(String(url),'http://identity.test/api/v1/auth/me');
        assert.equal(options.headers.Authorization,'Bearer test-token');
        return new Response(JSON.stringify({success:true,data:{id,status:true,role,username:'tester',name:'Tester'}}),{status});
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
    const data={id:3,creator_id:1,content:'Hello',views_count:0,status:true,created_at:new Date(),updated_at:new Date(),deleted_at:null,...extra};
    return {...data,reload:async()=>{},toJSON:()=>({...data}),update:async values=>{Object.assign(data,values);return {reload:async()=>{},toJSON:()=>({...data})};},destroy:async()=>{}};
}
test('me returns verified identity',async()=>{identity();const r=await request('/me');assert.equal(r.status,200);assert.equal(r.body.data.id,1);});
test('personalized feed uses authenticated network scope before pagination',async()=>{identity(2);mock.method(Models.Post,'findAndCountAll',async options=>{const scope=options.where[Op.and][1];assert.equal(scope.status,true);assert.match(scope[Op.and].val,/Post.creator_id = 2/);assert.match(scope[Op.and].val,/f.follower_id = 2/);assert.match(scope[Op.and].val,/fr.status = 'accepted'/);assert.match(scope[Op.and].val,/fr.user_high_id = 2/);assert.equal(options.offset,10);return {count:0,rows:[]};});assert.equal((await request('/feed?page=2&user_id=999')).status,200);});
test('discover feed stays public-active and rejects invalid modes',async()=>{identity();mock.method(Models.Post,'findAndCountAll',async options=>{assert.deepEqual(options.where[Op.and][1],{status:true});return {count:0,rows:[]};});assert.equal((await request('/feed?mode=discover')).status,200);assert.equal((await request('/feed?mode=invalid')).status,422);assert.equal((await request('/feed?status=false')).status,422);assert.equal((await request('/feed','GET',undefined,false)).status,401);});
test('friend name search filters all accepted friendships before pagination',async()=>{identity();mock.method(Models.Friendship,'findAll',async options=>{assert.equal(options.where.status,'accepted');return Array.from({length:15},(_,index)=>record({id:index+1,user_low_id:1,user_high_id:index+2}));});mock.method(ConnectionIdentity,'searchIds',async(ids,search,authorization)=>{assert.ok(ids.includes(16));assert.equal(search,'sazad');assert.equal(authorization,'Bearer test-token');return new Set([16]);});const result=await request('/connections?view=friends&search=sazad');assert.equal(result.status,200);assert.equal(result.body.data[0].user_id,16);assert.equal(result.body.pagination.total,1);});
test('profile connections reject private requests before querying records',async()=>{
 identity();mock.method(Models.Friendship,'findAndCountAll',()=>assert.fail('Private request query'));assert.equal((await request('/profiles/2/connections?view=incoming')).status,422);
});
test('profile followers use the profile ID instead of the authenticated ID',async()=>{
 identity();mock.method(ConnectionIdentity,'requireActiveUser',async id=>assert.equal(id,2));mock.method(Models.Follow,'findAndCountAll',async options=>{assert.deepEqual(options.where,{following_id:2});return {count:0,rows:[]};});assert.equal((await request('/profiles/2/connections?view=followers')).status,200);
});
test('profile post type filtering runs before pagination',async()=>{
 identity();mock.method(Models.Post,'findAndCountAll',async options=>{const scope=options.where[Op.and][1];assert.equal(scope.creator_id,2);assert.equal(scope.kind,'post');assert.match(scope[Op.and].val,/pm.kind = 'image'/);return {count:0,rows:[]};});assert.equal((await request('/profiles/2/posts?type=photos')).status,200);assert.equal((await request('/profiles/2/posts?type=invalid')).status,422);
});
test('reshares preserve original post author and exclude inactive originals',async()=>{
 identity();mock.method(Models.PostRepost,'findAndCountAll',async options=>{assert.equal(options.where.creator_id,2);assert.equal(options.include[0].required,true);assert.deepEqual(options.include[0].where,{status:true});return {count:1,rows:[{post:record({creator_id:3}),created_at:new Date()}]};});const result=await request('/profiles/2/reshares');assert.equal(result.status,200);assert.equal(result.body.data[0].creator_id,3);assert.equal(result.body.pagination.total,1);
});
test('incoming requests exclude caller requests and paginate only their pairs',async()=>{
 identity(2);mock.method(Models.Friendship,'findAndCountAll',async options=>{assert.deepEqual(options.where[Op.or],[{user_low_id:2},{user_high_id:2}]);assert.equal(options.where.requester_id[Op.ne],2);assert.equal(options.where.status,'pending');assert.equal(options.offset,10);return {count:11,rows:[record({user_low_id:1,user_high_id:2,requester_id:1})]};});
 const result=await request('/connections?view=incoming&page=2');assert.equal(result.status,200);assert.ok(Array.isArray(result.body.data));assert.equal(result.body.data[0].user_id,1);assert.equal(result.body.pagination.has_next_page,false);
});
test('following and followers use the correct direction',async()=>{
 identity(2);mock.method(Models.Follow,'findAndCountAll',async options=>{const outgoing=Boolean(options.where.follower_id);assert.deepEqual(options.where,outgoing?{follower_id:2}:{following_id:2});return {count:1,rows:[record({follower_id:outgoing?2:3,following_id:outgoing?3:2})]};});
 for(const view of ['following','followers']){const result=await request('/connections?view='+view);assert.equal(result.status,200);assert.equal(result.body.data[0].user_id,3);}
});
test('unfollow cannot remove another user follow',async()=>{
 identity(2);mock.method(Models.Follow,'destroy',async options=>{assert.deepEqual(options.where,{follower_id:2,following_id:3});return 1;});assert.equal((await request('/follows/3','DELETE')).status,200);
});
test('self follow and invalid connection list are rejected',async()=>{
 identity();mock.method(Models.Follow,'findOrCreate',()=>assert.fail('unexpected follow'));
 assert.equal((await request('/follows/1','PUT')).status,422);assert.equal((await request('/connections?view=everything')).status,422);assert.equal((await request('/connections?page=0')).status,422);
});
test('follow validates active recipient and is idempotent for the authenticated pair',async()=>{
 identity(2);mock.method(ConnectionIdentity,'requireActiveUser',async(id,authorization)=>{assert.equal(id,3);assert.equal(authorization,'Bearer test-token');});
 mock.method(Models.Follow,'findOrCreate',async options=>{assert.deepEqual(options.where,{follower_id:2,following_id:3});return [record({follower_id:2,following_id:3}),false];});
 assert.equal((await request('/follows/3','PUT')).status,200);
});
test('missing token is 401',async()=>{assert.equal((await request('/posts','POST',{content:'Hi'},false)).status,401);});
test('revoked token remains 401',async()=>{identity(1,401);assert.equal((await request('/posts')).status,401);});
test('Identity network failure is 503',async()=>{mock.method(globalThis,'fetch',async()=>{throw new Error('offline');});assert.equal((await request('/posts')).status,503);});
test('invalid Identity payload fails closed',async()=>{identity('bad');assert.equal((await request('/posts')).status,503);});
test('post creation uses authenticated creator',async()=>{
    identity();mock.method(Models.Post,'create',async data=>{assert.deepEqual(data,{content:'Hello',kind:'post',creator_id:1});return {...record(),reload:async()=>{}};});
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
test('visible post view endpoint increments and returns the persisted count',async()=>{
    identity(2);transaction();const post=record({views_count:4});post.increment=async(field,options)=>{assert.equal(field,'views_count');assert.equal(options.by,1);post.views_count+=1;};post.reload=async()=>post;
    mock.method(Models.Post,'findOne',async()=>post);
    const result=await request('/posts/3/view','PUT',{});assert.equal(result.status,200);assert.equal(result.body.data.views,5);
});
test('post view count endpoint respects visibility and hides blocked creators',async()=>{
    identity(2);mock.method(Block,'findAll',async()=>[{blocker_id:1,blocked_id:2}]);mock.method(Models.Post,'findOne',async()=>record({creator_id:1}));
    assert.equal((await request('/posts/3/views')).status,404);
});
test('saving a post only creates a private authenticated-user bookmark',async()=>{
    identity(2);mock.method(Models.Post,'findOne',async options=>{assert.deepEqual(options.where,{id:3,status:true});return record({creator_id:1});});
    mock.method(Models.SavedPost,'findOrCreate',async options=>{assert.deepEqual(options.where,{creator_id:2,post_id:3});assert.deepEqual(options.defaults,options.where);return [{created_at:new Date('2026-10-12T00:00:00Z')},true];});
    const result=await request('/posts/3/saved','PUT',{});assert.equal(result.status,200);assert.equal(result.body.data.saved,true);
});
test('blocked and inactive posts cannot be saved',async()=>{
    identity(2);mock.method(Block,'findAll',async()=>[{blocker_id:1,blocked_id:2}]);mock.method(Models.Post,'findOne',async()=>record({creator_id:1}));
    assert.equal((await request('/posts/3/saved','PUT',{})).status,404);
});
test('saved moment list is private and excludes blocked or inactive post owners',async()=>{
    identity(2);mock.method(Block,'findAll',async()=>[{blocker_id:2,blocked_id:9}]);mock.method(Models.SavedPost,'findAll',async options=>{
        assert.deepEqual(options.where,{creator_id:2});assert.equal(options.include[0].where.status,true);assert.deepEqual(options.include[0].where.creator_id,{[Op.notIn]:[9]});
        return [{created_at:new Date('2026-10-12T00:00:00Z'),post:{toJSON:()=>({id:3,creator_id:1,content:'Saved',media:[]})}}];
    });
    const result=await request('/saved-posts');assert.equal(result.status,200);assert.equal(result.body.data[0].id,3);assert.equal(result.body.data[0].saved_at,'2026-10-12T00:00:00.000Z');
});
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
        assert.deepEqual(scopes[0],{post_id:3,parent_id:null,status:true});return {count:1,rows:[record({post_id:3})]};
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
        assert.deepEqual(scope,{post_id:3,parent_id:6,status:true});assert.equal(options.limit,1);assert.equal(options.offset,1);
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

test('media-only post creates ordered attachments and retains authenticated ownership',async()=>{
 identity();let values;let generated=[];
 mock.method(Models.Post,'create',async data=>{values=data;return {...record({content:'',kind:'post',media:[{id:9,kind:'image',mime_type:'image/png',size:68,sort_order:0}]}),reload:async()=>{}};});
 mock.method(Models.PostMedia,'bulkCreate',async rows=>{generated=rows.map(row=>row.filename);assert.equal(rows[0].kind,'image');assert.equal(rows[0].post_id,3);});
 const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=','base64');
 const form=new FormData();form.append('content','');form.append('kind','post');form.append('media',new Blob([fixture],{type:'image/png'}),'test.png');
 const response=await nativeFetch(base+'/api/v1/posts',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form});
 const body=await response.json();assert.equal(response.status,201);assert.equal(body.data.media[0].kind,'image');assert.equal(values.creator_id,1);
 const {cleanupFiles,UPLOAD_DIR}=await import('../middlewares/upload-media.middleware.js');
 const path=await import('node:path');
 for(const filename of generated)await cleanupFiles([{path:path.join(UPLOAD_DIR,filename)}]);
});
test('reel requires exactly one video',async()=>{
 identity();assert.equal((await request('/posts','POST',{content:'Text only',kind:'reel'})).status,422);
});
test('media-only empty post is rejected without attachments',async()=>{
 identity();assert.equal((await request('/posts','POST',{content:'',kind:'post'})).status,422);
});
test('profile posts are scoped to the requested author',async()=>{
 identity();mock.method(Models.Post,'findAndCountAll',async options=>{const scope=options.where[Object.getOwnPropertySymbols(options.where)[0]];assert.deepEqual(scope[1],{creator_id:2,status:true});return {count:0,rows:[]};});
 assert.equal((await request('/profiles/2/posts')).status,200);
});

test('media denies missing authentication, inactive posts and unsafe storage metadata',async()=>{
 assert.equal((await request('/posts/3/media/4','GET',undefined,false)).status,401);identity();
 mock.method(Models.Post,'findByPk',async()=>record({status:false}));mock.method(Models.PostMedia,'findOne',()=>assert.fail('Inactive post exposed media'));assert.equal((await request('/posts/3/media/4')).status,404);
 mock.restoreAll();identity();mock.method(Models.Post,'findByPk',async()=>record());
 for(const media of [{filename:'../private.mp4',mime_type:'video/mp4'},{filename:'safe.mp4',mime_type:'text/html'},{filename:null,mime_type:'video/mp4'}]){mock.method(Models.PostMedia,'findOne',async options=>{assert.deepEqual(options.where,{id:4,post_id:3});return media;});assert.equal((await request('/posts/3/media/4')).status,404);}
});
test('media sets private headers and treats cancelled transfers as normal',async()=>{
 const {default:PostController}=await import('../controllers/post.controller.js');const controller=new PostController();
 mock.method(Models.Post,'findByPk',async()=>record());mock.method(Models.PostMedia,'findOne',async()=>({filename:'aabb-ccdd.mp4',mime_type:'video/mp4'}));
 const headers={};const res={set:value=>Object.assign(headers,value),vary:value=>assert.equal(value,'Authorization'),sendFile:(file,options,callback)=>{assert.ok(file.endsWith('aabb-ccdd.mp4'));assert.deepEqual(options,{dotfiles:'deny',cacheControl:false,lastModified:false});callback({code:'ECONNABORTED'});}};
 await controller.media({params:{post_id:3,media_id:4}},res,()=>assert.fail('Aborted playback became an error'));
 assert.equal(headers['Content-Type'],'video/mp4');assert.equal(headers['Cache-Control'],'private, no-store');assert.equal(headers['Content-Disposition'],'inline');assert.equal(headers['X-Content-Type-Options'],'nosniff');
});

test('post upload accepts twelve ordered photos and rejects a thirteenth',async()=>{
 identity();const fixture=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=','base64');let files=[];
 mock.method(Models.Post,'create',async()=>({...record({content:'',kind:'post',media:[]}),reload:async()=>{}}));mock.method(Models.PostMedia,'bulkCreate',async rows=>{assert.equal(rows.length,12);assert.deepEqual(rows.map(row=>row.sort_order),Array.from({length:12},(_,index)=>index));files=rows.map(row=>row.filename);});
 const {cleanupFiles,UPLOAD_DIR}=await import('../middlewares/upload-media.middleware.js');const path=await import('node:path');
 try{const form=new FormData();for(let index=0;index<12;index++)form.append('media',new Blob([fixture],{type:'image/png'}),'photo-'+index+'.png');const response=await nativeFetch(base+'/api/v1/posts',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form});assert.equal(response.status,201);}finally{await cleanupFiles(files.map(filename=>({path:path.join(UPLOAD_DIR,filename)})));}
 mock.method(Models.Post,'create',()=>assert.fail('Thirteen photos reached database'));const form=new FormData();for(let index=0;index<13;index++)form.append('media',new Blob([fixture],{type:'image/png'}),'photo-'+index+'.png');const response=await nativeFetch(base+'/api/v1/posts',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form});assert.equal(response.status,422);
});
test('landscape photos are rejected through the real multipart endpoint before inserting a post',async()=>{identity();mock.method(Models.Post,'create',()=>assert.fail('Landscape photo reached database'));const {default:sharp}=await import('sharp');const fixture=await sharp({create:{width:3,height:2,channels:3,background:'#fff'}}).png().toBuffer();const form=new FormData();form.append('media',new Blob([fixture],{type:'image/png'}),'landscape.png');const response=await nativeFetch(base+'/api/v1/posts',{method:'POST',headers:{Authorization:'Bearer test-token'},body:form});assert.equal(response.status,422);assert.match((await response.json()).message,/square or portrait/);});

const {default:Report}=await import('../models/report.model.js');const {default:ModerationAction}=await import('../models/moderation-action.model.js');
test('block removes both follow directions and friendship in one transaction',async()=>{identity();mock.method(ConnectionIdentity,'requireActiveUser',async()=>({id:2}));mock.method(Block,'findOrCreate',async options=>{assert.deepEqual(options.where,{blocker_id:1,blocked_id:2});assert.ok(options.transaction);return [{id:9},true];});mock.method(Models.Friendship,'destroy',async options=>{assert.deepEqual(options.where,{user_low_id:1,user_high_id:2});assert.ok(options.transaction);return 1;});mock.method(Models.Follow,'destroy',async options=>{assert.deepEqual(options.where[Op.or],[{follower_id:1,following_id:2},{follower_id:2,following_id:1}]);assert.ok(options.transaction);return 2;});assert.equal((await request('/blocks/2','PUT')).status,200);});
test('unblocking removes only the caller’s own block and never recreates connections',async()=>{identity();mock.method(Block,'destroy',async options=>{assert.deepEqual(options.where,{blocker_id:1,blocked_id:2});return 1;});mock.method(Models.Friendship,'create',()=>assert.fail('Friendship restored'));assert.equal((await request('/blocks/2','DELETE')).status,200);});
test('either-direction block hides posts, media and prevents reactions',async()=>{identity();mock.method(Block,'findAll',async()=>[{blocker_id:2,blocked_id:1}]);mock.method(Models.Post,'findOne',async()=>record({creator_id:2}));mock.method(Models.Post,'findByPk',async()=>record({creator_id:2}));mock.method(Models.PostReaction,'create',()=>assert.fail('Blocked reaction inserted'));assert.equal((await request('/posts/3')).status,404);assert.equal((await request('/posts/3/media/4')).status,404);assert.equal((await request('/posts/3/reactions','PUT',{type:'like'})).status,404);});
test('block rejects friend requests and follows even through direct API calls',async()=>{identity();mock.method(Block,'findAll',async()=>[{blocker_id:1,blocked_id:2}]);mock.method(Block,'findOne',async()=>({id:9}));mock.method(Models.Friendship,'create',()=>assert.fail('Blocked friend request'));assert.equal((await request('/friendships/requests','POST',{recipient_id:2})).status,403);assert.equal((await request('/follows/2','PUT')).status,403);});
test('feed query excludes blocked creators before pagination',async()=>{identity();mock.method(Block,'findAll',async()=>[{blocker_id:1,blocked_id:2}]);mock.method(Models.Post,'findAndCountAll',async options=>{assert.deepEqual(options.where[Op.and][0].creator_id[Op.notIn],[2]);assert.equal(options.where[Op.and][0].status,true);return {count:0,rows:[]};});assert.equal((await request('/feed?mode=discover')).status,200);});
test('regular users cannot access reports or review decisions by claiming an admin role',async()=>{identity();mock.method(Report,'findAndCountAll',()=>assert.fail('Reports disclosed'));assert.equal((await request('/moderation/reports')).status,403);assert.equal((await request('/moderation/reports/4','PATCH',{role:'admin',action:'dismiss',note:'A fabricated role',decision_id:crypto.randomUUID()})).status,403);});
test('report uses server-owned target author and rejects client ownership or self reports',async()=>{identity();mock.method(Models.Post,'findByPk',async()=>record({creator_id:2}));mock.method(Models.PostMedia,'findAll',async()=>[]);mock.method(Report,'findOrCreate',async options=>{assert.deepEqual(options.where,{reporter_id:1,target_type:'post',target_id:3});assert.equal(options.defaults.reported_user_id,2);assert.equal(options.defaults.snapshot.content,'Hello');return [{id:4,status:'open'},true];});assert.equal((await request('/reports','POST',{target_type:'post',target_id:3,reason:'spam'})).status,201);assert.equal((await request('/reports','POST',{target_type:'post',target_id:3,reason:'spam',reporter_id:99})).status,422);mock.method(Models.Post,'findByPk',async()=>record({creator_id:1}));assert.equal((await request('/reports','POST',{target_type:'post',target_id:3,reason:'spam'})).status,422);});
test('staff content decisions hide the target and record an audit within the same transaction',async()=>{identity(1,200,'moderator');const report={id:4,status:'open',target_type:'post',target_id:3,reported_user_id:2,update:async(values,options)=>{assert.equal(values.status,'resolved');assert.equal(values.moderator_id,1);assert.ok(options.transaction);}};mock.method(ModerationAction,'findOne',async()=>null);mock.method(Report,'findByPk',async()=>report);mock.method(Models.Post,'findByPk',async()=>({update:async(values,options)=>{assert.deepEqual(values,{status:false});assert.ok(options.transaction);}}));mock.method(ModerationAction,'create',async values=>{assert.equal(values.actor_id,1);assert.equal(values.report_id,4);assert.equal(values.action,'hide_content');return {};});assert.equal((await request('/moderation/reports/4','PATCH',{action:'hide_content',note:'Verified spam content',decision_id:crypto.randomUUID()})).status,200);});
test('hidden posts cannot be read or reacted to, even by directly addressing their IDs',async()=>{identity();mock.method(Models.Post,'findOne',async()=>record({status:false}));assert.equal((await request('/posts/3')).status,404);assert.equal((await request('/posts/3/reactions','PUT',{type:'like'})).status,404);});

test('staff cannot inspect or decide reports about themselves',async()=>{identity(1,200,'admin');mock.method(Report,'findByPk',async()=>({id:4,target_type:'post',target_id:3,reported_user_id:1}));mock.method(Models.Post,'update',()=>assert.fail('Self-reviewed report'));assert.equal((await request('/moderation/reports/4')).status,403);assert.equal((await request('/moderation/reports/4/history')).status,403);assert.equal((await request('/moderation/reports/4','PATCH',{action:'hide_content',note:'A self review is forbidden',decision_id:crypto.randomUUID()})).status,403);});
