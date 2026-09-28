import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import config from '../config/config.js';

export default async function identityAuth(req, res, next) {

    try {

        const authorization = req.headers.authorization || '';

        if (!/^Bearer +[^\s]+$/i.test(authorization)) {
            throw new errors.UnauthorizedException('A valid Bearer token is required');
        }

        const identityUrl = config.IDENTITY_URL;
        let response, body;

        try {

            response = await fetch(
                new URL('/api/v1/auth/me', identityUrl),
                {
                    headers: { Authorization: authorization },
                    signal: AbortSignal.timeout(3000),
                    redirect: 'error',
                }
            );

            if (response.ok) body = await response.json();

        } catch {
            throw new errors.ServiceUnavailableException('Identity Service is currently unavailable');
        }

        if (response.status === utils.HTTP_STATUS.HTTP_401_UNAUTHORIZED.status_code) {
            throw new errors.UnauthorizedException('Invalid, expired or revoked token');
        }

        if (!response.ok || body?.success !== true ||
            !Number.isSafeInteger(body?.data?.id) || body.data.id <= 0 ||
            body.data.status !== true
        ) {
            throw new errors.ServiceUnavailableException('Identity verification failed');
        }

        req.user = {
            id: body.data.id,
            username: body.data.username,
            name: body.data.name,
        }

        return next();

    } catch (e) {
        return next(e);
    }

}