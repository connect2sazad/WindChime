import { apiRequest } from './request.js';
const MESSAGES_API=import.meta.env?.VITE_MESSAGES_API_URL||'http://localhost:3103/api/v1';
export const getConversations=(token,page=1,signal,search='')=>apiRequest(MESSAGES_API,`/conversations?page=${page}&search=${encodeURIComponent(search)}`,{token,signal});
export async function startConversation(token,recipient_id,signal){return (await apiRequest(MESSAGES_API,'/conversations',{token,signal,method:'POST',body:{recipient_id}})).data;}
export const getMessages=(token,id,{before,after,signal}={})=>apiRequest(MESSAGES_API,`/conversations/${id}/messages${before?'?before='+before:after?'?after='+after:''}`,{token,signal});
export async function sendMessage(token,id,content,client_message_id,{files=[],postId}={}){let body={content,client_message_id,...(postId?{shared_post_id:postId}:{})};if(files.length){body=new FormData();body.append('content',content);body.append('client_message_id',client_message_id);for(const file of files)body.append('media',file);}return (await apiRequest(MESSAGES_API,`/conversations/${id}/messages`,{token,method:'POST',body,timeoutMs:120000})).data;}
export const getMessageMedia=(token,id,messageId,index,signal)=>apiRequest(MESSAGES_API,`/conversations/${id}/messages/${messageId}/media/${index}`,{token,signal,responseType:'blob',timeoutMs:120000});
export async function getSharedPost(token,id,messageId,signal){return (await apiRequest(MESSAGES_API,`/conversations/${id}/messages/${messageId}/post`,{token,signal})).data;}
export const markRead=(token,id,message_id)=>apiRequest(MESSAGES_API,`/conversations/${id}/read`,{token,method:'PATCH',body:{message_id}});
