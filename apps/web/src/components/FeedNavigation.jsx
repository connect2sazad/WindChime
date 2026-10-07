import { useLocation,useNavigate } from 'react-router-dom';
import { Icon,Avatar } from './FeedVisuals.jsx';
import '../pages/Home.css';
import './FeedNavigation.css';
export default function FeedNavigation({session,onLogout,loggingOut,logoutError}){
 const {pathname,search}=useLocation();const navigate=useNavigate();const user=session.user;
 const items=[['Home','home','/'],['Search','search','/connections?view=discover'],['Connections','people','/connections'],['Messages','comment','/messages'],['Create','plus','/create'],['Profile','user',`/profiles/${encodeURIComponent(user.username||'')}`]];
 return <><header className="wc-sidebar"><button className="wc-logo wc-brand-button" aria-label="WindChime home" onClick={()=>navigate('/')}><img src="/logo.svg" alt="WindChime"/></button>
  <nav className="wc-nav" aria-label="Main navigation">{items.map(([label,icon,path])=>{const active=label==='Search'?pathname==='/connections'&&search.includes('discover'):label==='Connections'?pathname==='/connections'&&!search.includes('discover'):pathname===path;return <button key={label} className={active?'active':''} aria-current={active?'page':undefined} onClick={()=>{navigate(path);window.scrollTo({top:0});}}><Icon name={icon}/><span>{label}</span></button>;})}</nav>
  <div className="wc-sidebar-bottom"><button className="wc-account" onClick={()=>navigate(`/profiles/${encodeURIComponent(user.username||'')}`)}><Avatar name={user.name} small id={user.id} token={session.token} version={user.avatar_version}/><span><strong>{user.name}</strong><small>@{user.username}</small></span></button><button className="wc-logout" onClick={onLogout} disabled={loggingOut}>{loggingOut?'Signing out…':'Sign out'}</button></div>
 </header>{logoutError&&<p className="wc-global-error" role="alert">{logoutError}</p>}</>;
}
