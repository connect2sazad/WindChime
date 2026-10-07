import Access from '../services/access.service.js';
import errors from '../errors/registry.js';
export default async function identityAuth(req,res,next){try{if(!/^Bearer +[^\s]+$/i.test(req.headers.authorization||''))throw new errors.UnauthorizedException('A valid Bearer token is required');req.auth=await Access.verifyIdentity(req.headers.authorization);next();}catch(e){next(e);}}
