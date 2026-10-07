import { registry } from './openapi.js';
import config from '../config/config.js';
import { LoginSchema, RegisterUserSchema } from '../schemas/auth.schema.js';
import responses from './responses.js';
import { z } from './openapi.js';
import { UserSchema } from '../schemas/user.schema.js';
import { VerifySignupSchema, ResendSignupSchema, AvailabilitySchema } from '../schemas/identity.schema.js';

const tokenSchema = z.object({ token: z.string(), token_type: z.literal('Bearer'), expires_in: z.union([z.string(), z.number()]) });
const loginResponse = responses.createSuccessResponseSchema('LoginResponse', UserSchema.extend({ token: tokenSchema }));
const registerResponse = responses.createSuccessResponseSchema('RegisterResponse', z.object({ verification_id: z.string().uuid(), email: z.string().email(), expires_in: z.number(), delivery: z.enum(['smtp', 'outbox']) }));
for (const [path, schema, status, result] of [
    ['register/verify', VerifySignupSchema, 201, loginResponse],
    ['register/resend', ResendSignupSchema, 200, registerResponse],
    ['availability', AvailabilitySchema, 200, responses.createSuccessResponseSchema('AvailabilityResponse', z.object({ field: z.enum(['username', 'email']), value: z.string(), available: z.boolean() }))]
]) registry.registerPath({ method: 'post', path: `${config.API_PREFIX}/auth/${path}`, tags: ['Authentication'], security: [],
    request: { body: { required: true, content: { 'application/json': { schema } } } },
    responses: { [status]: responses.jsonResponse('Success', result), 409: responses.errorResponse('Account already exists'), 422: responses.errorResponse('Invalid or expired verification'), 429: responses.errorResponse('Too many attempts'), 503: responses.errorResponse('Service unavailable') }
});
for (const [path, schema, success, status, description] of [
    ['login', LoginSchema, loginResponse, 200, 'Login successful'],
    ['register', RegisterUserSchema, registerResponse, 202, 'Verification code sent; account is created after verification']
]) {
    registry.registerPath({ method: 'post', path: `${config.API_PREFIX}/auth/${path}`, tags: ['Authentication'],
        security: [], summary: description,
        request: { body: { required: true, content: { 'application/json': { schema } } } },
        responses: { [status]: responses.jsonResponse(description, success),
            400: responses.errorResponse('Malformed JSON'), 401: responses.errorResponse('Invalid credentials'),
            409: responses.errorResponse('Username or email already exists'), 413: responses.errorResponse('Payload too large'),
            415: responses.errorResponse('Unsupported media type'), 422: responses.errorResponse('Invalid request data'),
            ...(path === 'login' && { 429: responses.errorResponse('Too many login attempts') }),
            500: responses.errorResponse('Internal server error'), 503: responses.errorResponse('Database unavailable') }
    });
}
registry.registerPath({ method: 'put', path: `${config.API_PREFIX}/auth/logout`, tags: ['Authentication'],
    security: [{ bearerAuth: [] }], summary: 'Revoke the current token',
    responses: { 200: responses.jsonResponse('Logout successful', responses.EmptyResponseSchema),
        401: responses.errorResponse('Invalid or revoked token'), 500: responses.errorResponse('Internal server error'),
        503: responses.errorResponse('Database unavailable') }
});
