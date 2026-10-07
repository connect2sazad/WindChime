import { z, registry } from './openapi.js';
import config from '../config/config.js';
import { UserSchema } from '../schemas/user.schema.js';
import { ParamsIdSchema } from '../schemas/base.schema.js';
import { PaginationSchema, PaginationResponseSchema } from '../schemas/pagination.schema.js';
import responses from './responses.js';

for (const single of [false, true]) {
    const schema = z.object({ success: z.literal(true), message: z.string(),
        data: single ? UserSchema : z.array(UserSchema),
        ...(!single && { pagination: PaginationResponseSchema }) });
    registry.registerPath({ method: 'get', path: `${config.API_PREFIX}/users${single ? '/{id}' : ''}`,
        tags: ['Users'], summary: single ? 'Get user' : 'List users', security: [{ bearerAuth: [] }],
        request: single ? { params: ParamsIdSchema } : { query: PaginationSchema },
        responses: { 200: responses.jsonResponse('Users retrieved', schema),
            401: responses.errorResponse('Invalid or revoked token'), 404: responses.errorResponse('User not found'),
            422: responses.errorResponse('Invalid parameters'), 500: responses.errorResponse('Internal server error'),
            503: responses.errorResponse('Database unavailable') }
    });
}
