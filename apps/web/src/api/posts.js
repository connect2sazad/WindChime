import { apiRequest, SOCIAL_API } from './request.js';
export async function updatePost(token,id,content){const result=await apiRequest(SOCIAL_API,`/posts/${id}`,{token,method:'PATCH',body:{content}});if(result.data?.id!==id)throw new Error('Could not confirm the updated post. Refresh before retrying.');return result.data;}
export async function deletePost(token,id){await apiRequest(SOCIAL_API,`/posts/${id}`,{token,method:'DELETE'});}
export async function getPosts(token, signal, page=1) {
    const body = await apiRequest(SOCIAL_API, `/posts?page=${page}&limit=10&status=true`, { token, signal });
    if (!Array.isArray(body.data)) throw new Error('Unexpected posts response');
    return body;
}
export async function createPost(token, content, {kind='post',files=[]}={}) {
    let payload={content,kind};
    if(files.length){payload=new FormData();payload.append('content',content);payload.append('kind',kind);for(const file of files)payload.append('media',file);}
    const body=await apiRequest(SOCIAL_API,'/posts',{token,method:'POST',body:payload,timeoutMs:120000});
    if (!Number.isInteger(body.data?.id)) throw new Error('Unexpected post response');
    return body.data;
}

export async function getUserPosts(token,userId,page=1,signal,type='all'){
 return apiRequest(SOCIAL_API,`/profiles/${userId}/posts?page=${page}&limit=10&type=${type}`,{token,signal});
}
export async function getUserReshares(token,userId,page=1,signal){return apiRequest(SOCIAL_API,`/profiles/${userId}/reshares?page=${page}&limit=10`,{token,signal});}
export async function getMediaBlob(token,postId,mediaId,signal){
 return apiRequest(SOCIAL_API,`/posts/${postId}/media/${mediaId}`,{token,signal,responseType:'blob',timeoutMs:120000});
}
