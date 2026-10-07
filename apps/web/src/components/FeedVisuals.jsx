import { useEffect,useState } from 'react';
import { getProfilePicture } from '../api/users.js';
export function Icon({ name, size = 22 }) {
    const paths = {
        home: <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></>,
        search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
        people: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6" /></>,
        plus: <><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M12 7v10M7 12h10" /></>,
        user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
        heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
        comment: <path d="M21 11.5a9 9 0 0 1-9 9 10 10 0 0 1-4-.9L3 21l1.4-5a9 9 0 1 1 16.6-4.5Z" />,
        arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
        reshare: <><path d="M7 7h10a4 4 0 0 1 4 4v1" /><path d="m17 4 3 3-3 3" /><path d="M17 17H7a4 4 0 0 1-4-4v-1" /><path d="m7 20-3-3 3-3" /></>,
        send: <path d="m22 2-7 20-4-9-9-4Z" />,
    };

    return (
        <svg width={size} height={size} viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {paths[name]}
        </svg>
    );
}

export function Avatar({ name, tone = '', small = false, id,token,version,large=false }) {
    const [picture,setPicture]=useState(null);
    useEffect(()=>{const controller=new AbortController();let url;async function load(){if(!id||!token||version===null)return;try{const blob=await getProfilePicture(token,id,controller.signal);if(!controller.signal.aborted){url=URL.createObjectURL(blob);setPicture({id,version,url});}}catch{/* Initials remain visible when a picture is unavailable. */}}load();return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};},[id,token,version]);
    const initials = name.trim().split(/\s+/)
        .slice(0, 2).map(part => part[0]).join('').toUpperCase();

    return (
        <span className={`wc-avatar ${tone} ${small ? 'small' : ''} ${large?'large':''}`} aria-hidden="true">
            {picture?.id===id&&picture?.version===version?<img src={picture.url} alt=""/>:initials}
        </span>
    );
}

