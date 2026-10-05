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

const IdentityService = {requireActiveUser};
export default IdentityService;