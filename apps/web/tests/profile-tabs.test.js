import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visibleProfileList} from '../src/modules/profiles/utils/profileList.js';
const key=(tab,page=1,profile=2)=>JSON.stringify([profile,'test-session',tab,page,0]);
test('switching from connections to any post tab hides connection records immediately',()=>{
 const snapshot={key:key('friends'),rows:[{id:7,name:'Friend',username:'friend'}],pagination:{total:1},loading:false,error:''};
 for(const tab of ['all','text','photos','videos','reels','reshares']){const view=visibleProfileList(snapshot,key(tab));assert.equal(view.loading,true);assert.deepEqual(view.rows,[]);assert.equal(view.pagination,null);}
 assert.equal(visibleProfileList(snapshot,key('friends')).rows[0].username,'friend');
});
test('post records and old errors cannot leak into connections or another profile/page',()=>{
 const snapshot={key:key('all'),rows:[{id:3,creator_id:2,content:'Post'}],pagination:{total:1},loading:false,error:'Old error'};
 for(const viewKey of [key('friends'),key('followers'),key('following'),key('all',2),key('all',1,3)]){const view=visibleProfileList(snapshot,viewKey);assert.equal(view.loading,true);assert.deepEqual(view.rows,[]);assert.equal(view.error,'');}
});
test('an older response cannot replace the visible state of a newer tab',()=>{
 const active=key('reels');const stale={key:key('friends'),rows:[{id:7,name:'Friend'}],loading:false};
 assert.equal(visibleProfileList(stale,active).loading,true);
 const ready={key:active,rows:[{id:8,creator_id:2,kind:'reel'}],pagination:{total:1},loading:false,error:''};
 assert.equal(visibleProfileList(ready,active),ready);
});
