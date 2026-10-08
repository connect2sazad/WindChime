import {apiRequest} from '../../../shared/api/request.js';
export const NOTIFICATIONS_API=import.meta.env?.VITE_NOTIFICATIONS_API_URL||'http://localhost:3104/api/v1';
export async function listNotifications(token,{page=1,unread=false,signal}={}){const result=await apiRequest(NOTIFICATIONS_API,'/notifications?page='+page+'&limit=20'+(unread?'&unread=true':''),{token,signal});if(!Array.isArray(result.data)||!result.pagination||!Number.isSafeInteger(result.unread_count))throw new Error('Unexpected notification response');return result;}
export async function unreadCount(token,signal){const result=await apiRequest(NOTIFICATIONS_API,'/notifications/unread-count',{token,signal});if(!Number.isSafeInteger(result.data?.count)||result.data.count<0)throw new Error('Unexpected notification count');return result.data.count;}
export async function markRead(token,id){await apiRequest(NOTIFICATIONS_API,'/notifications/'+id+'/read',{token,method:'PATCH'});}
export async function markAllRead(token,through_id){await apiRequest(NOTIFICATIONS_API,'/notifications/read-all',{token,method:'PATCH',body:{through_id}});}
export function announceRead(){window.dispatchEvent(new Event('windchime:notifications-changed'));}
