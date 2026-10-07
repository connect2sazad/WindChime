import ProfileLink from './ProfileLink.jsx';
import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import { listConnections } from '../api/connections.js';
import { getDisplayUser } from '../api/users.js';
import { Avatar } from './FeedVisuals.jsx';
import ConnectionActions from './ConnectionActions.jsx';
import '../pages/Connections.css';
export default function FriendRequestsPreview({session}){
 const [rows,setRows]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('');const [revision,setRevision]=useState(0);
 useEffect(()=>{const controller=new AbortController();async function load(){setLoading(true);try{const result=await listConnections(session.token,'incoming',1,controller.signal);const people=await Promise.all(result.data.slice(0,3).map(row=>getDisplayUser(session.token,row.user_id,controller.signal)));if(!controller.signal.aborted){setRows(people);setError('');}}catch(e){if(!controller.signal.aborted)setError(e.message);}finally{if(!controller.signal.aborted)setLoading(false);}}load();return()=>controller.abort();},[session.token,revision]);
 return <><div className="wc-panel-heading"><h2>Friend requests</h2><Link to="/connections">View all</Link></div><div className="wc-request-preview">{loading?<p role="status">Loading requests…</p>:error?<p role="alert">{error}</p>:rows.length?rows.map(user=><article key={user.id}><ProfileLink className="wc-person-identity" username={user.username}><Avatar name={user.name} small id={user.id} token={session.token}/><strong>{user.name}</strong></ProfileLink><ConnectionActions session={session} userId={user.id} onChange={()=>setRevision(value=>value+1)}/></article>):<p>No new requests. Your next hello is out there.</p>}<Link to="/connections?view=following">See who you follow →</Link></div></>;
}
