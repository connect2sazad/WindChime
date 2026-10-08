import { useEffect,useState } from 'react';
import { getProfilePicture } from '../api/index.js';
import AvatarView from '../../../shared/components/Avatar.jsx';
export default function Avatar({ name, tone = '', small = false, id,token,version,large=false }) {
    const [picture,setPicture]=useState(null);
    useEffect(()=>{const controller=new AbortController();let url;async function load(){if(!id||!token||version===null)return;try{const blob=await getProfilePicture(token,id,controller.signal);if(!controller.signal.aborted){url=URL.createObjectURL(blob);setPicture({id,version,url});}}catch{/* Initials remain visible when a picture is unavailable. */}}load();return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};},[id,token,version]);
    return <AvatarView name={name} tone={tone} small={small} large={large} src={picture?.id===id&&picture?.version===version?picture.url:undefined}/>;
}
