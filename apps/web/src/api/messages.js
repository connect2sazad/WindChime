import { apiRequest } from './request.js';
const MESSAGES_API=import.meta.env?.VITE_MESSAGES_API_URL||'http://localhost:3103/api/v1';
export const getConversations=(token,page=1,signal)=>apiRequest(MESSAGES_API,`/conversations?page=${page}`,{token,signal});
export async function startConversation(token,recipient_id,signal){return (await apiRequest(MESSAGES_API,'/conversations',{token,signal,method:'POST',body:{recipient_id}})).data;}
export const getMessages=(token,id,{before,after,signal}={})=>apiRequest(MESSAGES_API,`/conversations/${id}/messages${before?'?before='+before:after?'?after='+after:''}`,{token,signal});
export async function sendMessage(token,id,content,client_message_id){return (await apiRequest(MESSAGES_API,`/conversations/${id}/messages`,{token,method:'POST',body:{content,client_message_id}})).data;}
export const markRead=(token,id,message_id)=>apiRequest(MESSAGES_API,`/conversations/${id}/read`,{token,method:'PATCH',body:{message_id}});
