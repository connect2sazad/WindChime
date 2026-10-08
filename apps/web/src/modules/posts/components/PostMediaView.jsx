import { useEffect,useRef,useState } from 'react';
import VideoPlayer from '../../../shared/components/VideoPlayer.jsx';
import { getMediaBlob } from '../api/index.js';
function MediaItem({item,postId,token,reel}){
 const container=useRef(null);const [visible,setVisible]=useState(false);const [url,setUrl]=useState('');const [error,setError]=useState('');
 useEffect(()=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:'300px'});observer.observe(container.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(!visible)return;const controller=new AbortController();let objectUrl='';async function load(){try{const blob=await getMediaBlob(token,postId,item.id,controller.signal);if(controller.signal.aborted)return;objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}catch(e){if(!controller.signal.aborted)setError(e.message);}}load();return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};},[visible,token,postId,item.id]);
 return <div ref={container} className="wc-media-item">
  {error?<p className="wc-media-error" role="alert">{error}</p>:!url?<div className="wc-media-loading" role="status">{visible?`Loading ${item.kind}…`:'Media'}</div>:item.kind==='video'?<VideoPlayer src={url} reel={reel} label={reel?'Reel':'Post video'}/>:<img src={url} alt="Post attachment" loading="lazy" onError={()=>setError('Image could not be displayed')}/>}
 </div>;
}
export default function PostMediaView({post,token}){
 const media=[...(post.media||[])].sort((a,b)=>a.sort_order-b.sort_order);
 if(!media.length)return null;
 return <div className={`wc-post-media ${post.kind==='reel'?'reel':''} ${media.length>1?'gallery':''}`}>
  {media.map(item=><MediaItem key={token+':'+post.id+':'+item.id} item={item} postId={post.id} token={token} reel={post.kind==='reel'}/>)}
 </div>;
}
