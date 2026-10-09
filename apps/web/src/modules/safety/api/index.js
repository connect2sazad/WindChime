import {apiRequest,SOCIAL_API} from '../../../shared/api/request.js';
export const blockUser=(token,id)=>apiRequest(SOCIAL_API,'/blocks/'+id,{token,method:'PUT'});export const unblockUser=(token,id)=>apiRequest(SOCIAL_API,'/blocks/'+id,{token,method:'DELETE'});
export const listBlocks=(token,page=1,signal)=>apiRequest(SOCIAL_API,'/blocks?page='+page,{token,signal});export const sendReport=(token,body)=>apiRequest(SOCIAL_API,'/reports',{token,method:'POST',body});
export const capabilities=(token,signal)=>apiRequest(SOCIAL_API,'/moderation/capabilities',{token,signal});export const listReports=(token,page=1,status='open',signal)=>apiRequest(SOCIAL_API,'/moderation/reports?page='+page+'&status='+status,{token,signal});export const reviewReport=(token,id,body)=>apiRequest(SOCIAL_API,'/moderation/reports/'+id,{token,method:'PATCH',body,timeoutMs:15000});export const reportHistory=(token,id)=>apiRequest(SOCIAL_API,'/moderation/reports/'+id+'/history',{token});
export function announceSafety(){window.dispatchEvent(new Event('windchime:safety-changed'));window.dispatchEvent(new Event('windchime:notifications-changed'));}

export const reportMedia=(token,reportId,mediaId,signal)=>apiRequest(SOCIAL_API,'/moderation/reports/'+reportId+'/media/'+mediaId,{token,signal,responseType:'blob',timeoutMs:120000});
