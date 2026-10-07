import { useEffect,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { listConnections,findPeople } from '../api/connections.js';
import { getDisplayUser } from '../api/users.js';
import { Avatar } from '../components/FeedVisuals.jsx';
import ConnectionActions from '../components/ConnectionActions.jsx';
import './Connections.css';
const TABS=[['incoming','Requests'],['sent','Sent'],['friends','Friends'],['following','Following'],['followers','Followers'],['discover','Find people']];
export default function Connections({session}){
 const [params,setParams]=useSearchParams();const selected=params.get('view')||'incoming';const view=TABS.some(([key])=>key===selected)?selected:'incoming';
 const [query,setQuery]=useState('');const [search,setSearch]=useState('');const [page,setPage]=useState(1);const [revision,setRevision]=useState(0);const [rows,setRows]=useState([]);const [pagination,setPagination]=useState(null);const [loading,setLoading]=useState(true);const [error,setError]=useState('');
 useEffect(()=>{const timer=setTimeout(()=>{setSearch(query.trim());setPage(1);},350);return()=>clearTimeout(timer);},[query]);
 useEffect(()=>{const controller=new AbortController();async function load(){setLoading(true);setError('');try{
  const result=view==='discover'?await findPeople(session.token,search,page,controller.signal):await listConnections(session.token,view,page,controller.signal);
  const people=view==='discover'?result.data.filter(user=>user.id!==session.user.id):await Promise.all(result.data.map(async row=>({...await getDisplayUser(session.token,row.user_id,controller.signal),connection:row})));
  if(!controller.signal.aborted){setRows(people);setPagination(result.pagination);}
 }catch(e){if(!controller.signal.aborted){setRows([]);setError(e.message);}}finally{if(!controller.signal.aborted)setLoading(false);}}load();return()=>controller.abort();},[session.token,session.user.id,view,search,page,revision]);
 function tab(key){setPage(1);setParams({view:key});}
 return <main className="wc-connections-page"><section className="wc-connections-content"><p className="wc-overline">MAKE ROOM FOR YOUR PEOPLE</p><h1>A little closer,<br/><em>one hello at a time.</em></h1><p className="wc-connections-description">Manage your friendships and follow the people you want to hear from.</p>
  <nav className="wc-connections-tabs" aria-label="Connection lists">{TABS.map(([key,label])=><button key={key} aria-current={view===key?'page':undefined} className={view===key?'active':''} onClick={()=>tab(key)}>{label}</button>)}</nav>
  {view==='discover'&&<label className="wc-people-search">Find someone<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or username" type="search" maxLength={100}/></label>}
  {loading?<p role="status">Finding your people…</p>:error?<div role="alert"><p>{error}</p><button onClick={()=>setRevision(value=>value+1)}>Retry</button></div>:rows.length?<div className="wc-people-list">{rows.map(user=><article className="wc-person-card" key={user.id}><Link className="wc-person-identity" to={`/profiles/${user.id}`}><Avatar name={user.name} id={user.id} token={session.token}/><div><strong>{user.name}</strong><small>{user.username?`@${user.username}`:'Account unavailable'}</small></div></Link>{user.username&&<ConnectionActions session={session} userId={user.id} onChange={()=>setRevision(value=>value+1)}/>}</article>)}</div>:<div className="wc-connections-empty"><span aria-hidden="true">✳</span><h2>{view==='incoming'?'No friend requests yet':view==='discover'?'No people found':'Nothing here yet'}</h2><p>{view==='incoming'?'New requests will appear here.':'Find people and make a little connection.'}</p>{view!=='discover'&&<button onClick={()=>tab('discover')}>Find people</button>}</div>}
  {!loading&&pagination&&<div className="wc-connections-pagination"><button disabled={!pagination.has_previous_page} onClick={()=>setPage(value=>value-1)}>Previous</button><span>Page {page}</span><button disabled={!pagination.has_next_page} onClick={()=>setPage(value=>value+1)}>Next</button></div>}
 </section></main>;
}
