// IdentityService service
import config from '../config/config.js';
import errors from '../errors/registry.js';

async function requireActiveUser(userId, authorization) {
    let response, body;

    try {
        response = await fetch(
            new URL('/api/v1/users/' + userId, config.IDENTITY_URL),
            {
                headers: { Authorization: authorization },
                signal: AbortSignal.timeout(3000),
                redirect: 'error',
            }
        );

        if (response.ok) body = await response.json();
    } catch {
        throw new errors.ServiceUnavailableException(
            'Identity service is unavailable'
        );
    }

    if (response.status === 401) {
        throw new errors.UnauthorizedException('Invalid or expired token');
    }

    if (response.status === 404) {
        throw new errors.NotFoundException('Recipient not found');
    }

    if (!response.ok || body?.success !== true ||
        body?.data?.id !== userId ||
        typeof body.data.status !== 'boolean') {
        throw new errors.ServiceUnavailableException(
            'Identity returned an unexpected response'
        );
    }

    if (!body.data.status) {
        throw new errors.NotFoundException('Recipient is unavailable');
    }

    return { id: body.data.id };
}

async function searchIds(ids,search,authorization){
 const matching=new Set();
 for(let offset=0;offset<ids.length;offset+=100){const batch=ids.slice(offset,offset+100);let response,body;
  try{response=await fetch(new URL('/api/v1/profiles/lookup',config.IDENTITY_URL),{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify({ids:batch,search}),signal:AbortSignal.timeout(3000),redirect:'error'});if(response.ok)body=await response.json();}catch{throw new errors.ServiceUnavailableException('Friend search is unavailable');}
  if(response.status===401)throw new errors.UnauthorizedException('Invalid or expired token');
  if(!response.ok||body?.success!==true||!Array.isArray(body.data)||body.data.some(user=>!batch.includes(user.id)))throw new errors.ServiceUnavailableException('Friend search is unavailable');
  for(const user of body.data)matching.add(user.id);
 }
 return matching;
}
const IdentityService = {requireActiveUser,searchIds};
export default IdentityService;
