/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : middlewares/jwt-tokenization.middleware.js
 *  Module        : Authentication
 *  Type          : JWT Tokenization Middleware
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides centralized JWT generation and authentication functionality by
 *  issuing signed authentication tokens and validating incoming bearer tokens
 *  before allowing access to protected application resources.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Generate signed JWT authentication tokens
 *  - Configure authentication token expiration
 *  - Extract bearer tokens from Authorization headers
 *  - Validate Authorization header format
 *  - Verify JWT signatures and expiration
 *  - Reject revoked authentication tokens
 *  - Verify the authenticated user exists and is active
 *  - Attach authenticated user information to the request
 *  - Attach the raw authentication token to the request
 *  - Attach the decoded JWT payload to the request
 *  - Forward authenticated requests to the next middleware
 *  - Forward authentication errors to centralized error handling
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import config from '../config/config.js';
import errors from '../errors/registry.js';
import Models from '../models/registry.js';

const authenticate = async (req, res, next) => {
    try {
        const match = /^Bearer +([^\s]+)$/i.exec(req.headers.authorization || '');
        if (!match) throw new errors.UnauthorizedException('A valid Bearer authorization token is required');
        const token = match[1];
        // Resolve server configuration outside the verification catch.
        const secret = config.JWT_SECRET_KEY;
        let decoded;
        try { decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }); }
        catch (error) {
            if (error instanceof jwt.JsonWebTokenError) throw new errors.UnauthorizedException('Invalid or expired authentication token');
            throw error;
        }
        if (!decoded || typeof decoded !== 'object' || !Number.isSafeInteger(decoded.id) || decoded.id <= 0 ||
            !Number.isFinite(decoded.exp) || !Number.isFinite(decoded.iat)) {
            throw new errors.UnauthorizedException('Invalid authentication token claims');
        }
        const token_hash = createHash('sha256').update(token).digest('hex');
        if (await Models.TokenBlacklist.findOne({ where: { token_hash } })) {
            throw new errors.UnauthorizedException('Authentication token has been revoked');
        }
        const user = await Models.User.findByPk(decoded.id);
        if (!user || !user.status) throw new errors.UnauthorizedException('Your account is unavailable or disabled');
        req.user = user;
        req.token = token;
        req.auth = decoded;
        return next();
    } catch (error) { return next(error); }
};

const generate = data => ({
    token: jwt.sign({ id: data.id, username: data.username, email: data.email }, config.JWT_SECRET_KEY,
        { algorithm: 'HS256', expiresIn: config.JWT_EXPIRES_IN }),
    token_type: 'Bearer',
    expires_in: config.JWT_EXPIRES_IN
});
export default { generate, authenticate };
