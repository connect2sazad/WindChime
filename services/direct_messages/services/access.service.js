import config from '../config/config.js';
import errors from '../errors/registry.js';
export async function remote(base, path, authorization, options = {}) { let response, body; try { response = await fetch(new URL(path, base), { ...options, headers: { Authorization: authorization, ...(options.body?{'Content-Type':'application/json'}:{}) }, signal: AbortSignal.timeout(3000), redirect: 'error' }); if (response.ok) body = await response.json(); } catch { throw new errors.ServiceUnavailableException('Messaging permissions could not be verified'); } if (response.status === 401) throw new errors.UnauthorizedException('Invalid or revoked token'); if (response.status === 404) throw new errors.NotFoundException('Account unavailable'); if (!response.ok || body?.success !== true) throw new errors.ServiceUnavailableException('Messaging permissions could not be verified'); return body.data; }
export async function verifyIdentity(authorization) { const user = await remote(config.IDENTITY_URL, '/api/v1/auth/me', authorization); if (!Number.isSafeInteger(user?.id) || user.id < 1 || user.status !== true) throw new errors.ServiceUnavailableException('Identity returned an invalid account'); return { id: user.id, name: user.name, username: user.username }; }
export async function requireFriend(req, peer) {
    if (peer === req.auth.id) throw new errors.ValidationException('You cannot message yourself');
    const [relation, user] = await Promise.all([remote(config.SOCIAL_URL, '/api/v1/connections/' + peer, req.headers.authorization), remote(config.IDENTITY_URL, '/api/v1/users/' + peer, req.headers.authorization)]);
    if (user?.id !== peer || user.status !== true) throw new errors.ForbiddenException('This account is unavailable for messaging');
    const friendship = relation?.friendship;
    if (!friendship || friendship.status !== 'accepted' || friendship.user_low_id !== Math.min(req.auth.id, peer) || friendship.user_high_id !== Math.max(req.auth.id, peer)) throw new errors.ForbiddenException('Only accepted friends can message each other');
    return true;
}
export default { verifyIdentity, requireFriend, remote };
