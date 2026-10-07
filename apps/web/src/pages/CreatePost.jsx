import { useEffect,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPost } from '../api/posts.js';
import './CreatePost.css';
const MODES=[['text','Text'],['images','Photos'],['video','Video'],['reel','Reel']];
export default function CreatePost({session}){
 const [mode,setMode]=useState('text');const [content,setContent]=useState('');const [files,setFiles]=useState([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const pending=useRef(false);const chooser=useRef(null);const urls=useRef(new Set());const navigate=useNavigate();
 useEffect(()=>{const allocated=urls.current;return()=>{for(const url of allocated)URL.revokeObjectURL(url);};},[]);
 function clearFiles(){for(const item of files){URL.revokeObjectURL(item.preview);urls.current.delete(item.preview);}setFiles([]);if(chooser.current)chooser.current.value='';}
 function chooseMode(value){clearFiles();setMode(value);setError('');}
 function choose(selected){
  const list=Array.from(selected);const candidate=mode==='images'?[...files.map(item=>item.file),...list]:list;
  if(!candidate.length)return;
  const imageMode=mode==='images';
  if(candidate.length>(imageMode?5:1)){setError(imageMode?'Choose up to five images':'Choose one video');return;}
  const allowed=imageMode?['image/jpeg','image/png','image/webp']:['video/mp4','video/webm'];
  if(candidate.some(file=>!allowed.includes(file.type))){setError(imageMode?'Use JPG, PNG or WebP':'Use MP4 or WebM');return;}
  const max=(imageMode?10:50)*1024*1024;if(candidate.some(file=>file.size>max)){setError(imageMode?'Each image must be 10 MB or smaller':'Video must be 50 MB or smaller');return;}
  clearFiles();const entries=candidate.map(file=>{const preview=URL.createObjectURL(file);urls.current.add(preview);return {id:crypto.randomUUID(),file,preview};});setFiles(entries);setError('');
 }
 function remove(id){const item=files.find(file=>file.id===id);URL.revokeObjectURL(item.preview);urls.current.delete(item.preview);setFiles(previous=>previous.filter(file=>file.id!==id));if(chooser.current)chooser.current.value='';}
 async function publish(event){event.preventDefault();if(pending.current||(!content.trim()&&!files.length))return;pending.current=true;setBusy(true);setError('');try{await createPost(session.token,content.trim(),{kind:mode==='reel'?'reel':'post',files:files.map(item=>item.file)});navigate('/',{replace:true});}catch(e){setError(e instanceof TypeError||e.name==='TimeoutError'?'Could not confirm publication. Check your profile before retrying.':e.message);}finally{pending.current=false;setBusy(false);}}
 return <main className="wc-create-page">
  <section className="wc-create-card"><p className="wc-overline">MAKE A LITTLE CONNECTION</p><h1>Share a <em>moment.</em></h1><p className="wc-create-description">A thought, a photo, or a moving story.</p>
   <div className="wc-create-modes" role="group" aria-label="Post format">{MODES.map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} disabled={busy} onClick={()=>chooseMode(value)}>{label}</button>)}</div>
   <form onSubmit={publish}><label htmlFor="post-caption">{mode==='text'?'Your post':'Caption (optional)'}</label><textarea id="post-caption" value={content} onChange={e=>setContent(e.target.value)} placeholder={`What’s on your mind, ${session.user.name.split(' ')[0]}?`} maxLength={2000} rows={6} disabled={busy}/><small>{content.length}/2000</small>
    {mode!=='text'&&<><input ref={chooser} id="post-media" type="file" multiple={mode==='images'} accept={mode==='images'?'image/jpeg,image/png,image/webp':'video/mp4,video/webm'} onChange={e=>choose(e.target.files)} disabled={busy} className="wc-file-input"/>
     <div className="wc-dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy)choose(e.dataTransfer.files);}}><strong>{mode==='images'?'Bring your moment to life.':mode==='reel'?'One video. Your story.':'Share something in motion.'}</strong><p>{mode==='images'?'Up to 5 images · 10 MB each':'One MP4 or WebM video · up to 50 MB'}</p><button type="button" disabled={busy} onClick={()=>chooser.current.click()}>Choose {mode==='images'?'photos':'video'}</button></div>
     <div className={`wc-create-previews ${mode==='reel'?'reel':''}`}>{files.map(item=><div className="wc-create-preview" key={item.id}>{mode==='images'?<img src={item.preview} alt={item.file.name}/>:<video src={item.preview} controls playsInline/>}<button type="button" aria-label={`Remove ${item.file.name}`} disabled={busy} onClick={()=>remove(item.id)}>×</button></div>)}</div>
    </>}
    {error&&<p className="wc-create-error" role="alert">{error}</p>}
    <button className="wc-create-publish" disabled={busy||(!content.trim()&&!files.length)||(mode!=='text'&&!files.length)}>{busy?'Publishing…':mode==='reel'?'Publish Reel':'Publish post'}</button>
   </form>
  </section>
 </main>;
}
