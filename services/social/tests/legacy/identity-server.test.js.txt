import { test, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UniqueConstraintError, ForeignKeyConstraintError, ConnectionError, ValidationError, ValidationErrorItem } from 'sequelize';

// Tests never use the developer's database or credentials.
Object.assign(process.env, {
    PROJECT_NAME: 'test', PROJECT_TITLE: 'Test', PORT: '3000', ENVIRONMENT: 'test',
    API_PREFIX: '/api/v1', API_VERSION: '1', JWT_SECRET_KEY: 'test-only-secret-not-for-production',
    JWT_EXPIRES_IN: '1h', LOGIN_LIMIT: '100', DB_DIALECT: 'mysql', DB_HOST: '127.0.0.1',
    DB_PORT: '3306', DB_NAME: 'unused_test_database', DB_USER: 'unused', DB_PASSWORD: '',
    ALLOWED_ORIGINS: 'http://allowed.example'
});
const { default: app } = await import('../init.js');
const { default: Models } = await import('../models/registry.js');
const { default: sequelize } = await import('../config/sequelize.js');
const { default: Schemas } = await import('../schemas/registry.js');
const { default: ErrorHandler } = await import('../middlewares/errors.middleware.js');
const { default: AppException } = await import('../errors/AppException.js');
const { default: HTTP } = await import('../utils/status_codes.js');
const { default: Controllers } = await import('../controllers/registry.js');
const { default: config } = await import('../config/config.js');
let server, base;
const record = { id: 1, status: true, username: 'tester', name: 'Tester', email: 'test@example.com',
    created_at: new Date(), updated_at: new Date() };
const user = { ...record, toJSON: () => ({ ...record }) };
const token = (claims = {}, options = {}) => jwt.sign({ id: 1, ...claims }, process.env.JWT_SECRET_KEY,
    { expiresIn: '1h', ...options });
const authenticate = () => {
    mock.method(Models.TokenBlacklist, 'findOne', async () => null);
    mock.method(Models.User, 'findByPk', async () => user);
};
const request = async (path, options = {}) => {
    const response = await fetch(base + path, options);
    return { status: response.status, headers: response.headers, body: await response.json() };
};
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const auth = () => ({ Authorization: 'Bearer ' + token() });
before(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = 'http://127.0.0.1:' + server.address().port;
});
afterEach(() => mock.restoreAll());
after(async () => { await new Promise(resolve => server.close(resolve)); await sequelize.close(); });

test('unknown routes return JSON 404 with a request ID', async () => {
    const result = await request('/missing');
    assert.equal(result.status, 404);
    assert.equal(result.body.code, 'NOT_FOUND');
    assert.equal(result.body.request_id, result.headers.get('x-request-id'));
});
test('CORS rejection keeps the error envelope and request ID', async () => {
    const result = await request('/health', { headers: { Origin: 'http://denied.example' } });
    assert.equal(result.status, 403); assert.ok(result.body.request_id);
});
test('invalid JSON is 400 and oversized JSON is 413', async () => {
    let result = await request('/api/v1/auth/login', { ...post({}), body: '{' });
    assert.equal(result.status, 400); assert.equal(result.body.code, 'INVALID_JSON');
    result = await request('/api/v1/auth/login', post({ value: 'x'.repeat(110000) }));
    assert.equal(result.status, 413);
});
test('unsupported charset is 415', async () => {
    const result = await request('/api/v1/auth/login', { ...post({}), headers: { 'Content-Type': 'application/json; charset=unsupported' } });
    assert.equal(result.status, 415);
});
test('invalid login and registration bodies are 422', async () => {
    for (const route of ['login', 'register']) {
        const result = await request('/api/v1/auth/' + route, post({}));
        assert.equal(result.status, 422); assert.ok(result.body.errors.length);
    }
});
test('registration does not require generated fields and validates matching storage limits', () => {
    const data = { username: 'tester', name: 'Tester', email: 'test@example.com', password: 'secret123', confirm_password: 'secret123' };
    assert.ok(Schemas.RegisterUserSchema.safeParse(data).success);
    assert.equal(Schemas.RegisterUserSchema.safeParse({ ...data, confirm_password: 'different' }).success, false);
    assert.equal(Schemas.RegisterUserSchema.safeParse({ ...data, username: 'x'.repeat(51) }).success, false);
    assert.equal(Schemas.UserUpdateSchema.safeParse({ username: 'x'.repeat(51) }).success, false);
    assert.equal(Schemas.UserUpdateSchema.safeParse({}).success, false);
    assert.equal(Schemas.RegisterUserSchema.safeParse({ ...data, password: 'é'.repeat(37), confirm_password: 'é'.repeat(37) }).success, false);
});
test('missing, malformed, expired, not-yet-active and invalid-claim tokens return 401', async () => {
    const tokens = [null, 'bad-token', token({}, { expiresIn: -1 }), token({}, { notBefore: '1h' }), token({ id: '1' }),
        jwt.sign({ id: 1 }, process.env.JWT_SECRET_KEY), token() + ' extra'];
    for (const value of tokens) {
        const result = await request('/api/v1/users', { headers: value ? { Authorization: 'Bearer ' + value } : {} });
        assert.equal(result.status, 401); assert.equal(result.headers.get('www-authenticate'), 'Bearer');
    }
});
test('revoked and disabled-user tokens return 401', async () => {
    authenticate();
    Models.TokenBlacklist.findOne.mock.mockImplementation(async () => ({ id: 1 }));
    assert.equal((await request('/api/v1/users', { headers: auth() })).status, 401);
    Models.TokenBlacklist.findOne.mock.mockImplementation(async () => null);
    Models.User.findByPk.mock.mockImplementation(async () => ({ ...user, status: false }));
    assert.equal((await request('/api/v1/users', { headers: auth() })).status, 401);
});
test('collection route paginates without an ID and applies false status filter', async () => {
    authenticate();
    let query;
    mock.method(Models.User, 'findAndCountAll', async options => { query = options; return { count: 3, rows: [user] }; });
    const result = await request('/api/v1/users?page=2&limit=2&status=false', { headers: auth() });
    assert.equal(result.status, 200); assert.equal(query.limit, 2); assert.equal(query.offset, 2);
    assert.equal(query.where.status, false); assert.equal(result.body.pagination.limit, 2);
});
test('invalid ID and invalid pagination are 422; missing record is 404', async () => {
    authenticate();
    assert.equal((await request('/api/v1/users/abc', { headers: auth() })).status, 422);
    assert.equal((await request('/api/v1/users?limit=101', { headers: auth() })).status, 422);
    mock.method(Models.User, 'findOne', async () => null);
    assert.equal((await request('/api/v1/users/99', { headers: auth() })).status, 404);
});
test('invalid server response data stays 500, not 422', async () => {
    authenticate(); mock.method(Models.User, 'findOne', async () => ({ toJSON: () => ({ id: 1 }) }));
    const result = await request('/api/v1/users/1', { headers: auth() });
    assert.equal(result.status, 500); assert.equal(result.body.code, 'INTERNAL_SERVER_ERROR');
});
test('wrong password reports invalid credentials', async () => {
    mock.method(Models.User, 'findOne', async () => ({ ...user, password: await bcrypt.hash('correct123', 4) }));
    const result = await request('/api/v1/auth/login', post({ username: 'tester', password: 'wrong123' }));
    assert.equal(result.status, 401); assert.equal(result.body.message, 'Invalid username or password.');
});
test('registration duplicate precheck returns 409', async () => {
    mock.method(Models.User, 'findOne', async options => { assert.equal(options.paranoid, false); return user; });
    const result = await request('/api/v1/auth/register', post({ username: 'tester', name: 'Tester', email: 'test@example.com', password: 'secret123', confirm_password: 'secret123' }));
    assert.equal(result.status, 409);
});
test('logout answers both newly-created and concurrently-existing blacklist entries', async () => {
    authenticate();
    const stub = mock.method(Models.TokenBlacklist, 'findOrCreate', async options => {
        assert.match(options.where.token_hash, /^[a-f0-9]{64}$/); return [{}, false];
    });
    for (const created of [false, true]) {
        stub.mock.mockImplementationOnce(async () => [{}, created]);
        assert.equal((await request('/api/v1/auth/logout', { method: 'PUT', headers: auth() })).status, 200);
    }
});
test('readiness failures use a 503 error envelope', async () => {
    mock.method(sequelize, 'authenticate', async () => { throw new ConnectionError(new Error('private connection detail')); });
    const result = await request('/health/ready');
    assert.equal(result.status, 503); assert.equal(result.body.code, 'SERVICE_UNAVAILABLE');
    assert.ok(result.body.request_id); assert.ok(!JSON.stringify(result.body).includes('private connection detail'));
});
test('database errors preserve their intended status', () => {
    const cases = [[new UniqueConstraintError({ errors: [] }), 409], [new ForeignKeyConstraintError({}), 409],
        [new ValidationError('invalid', [new ValidationErrorItem('bad')]), 422], [new ConnectionError(new Error('private')), 503], [new Error('secret'), 500]];
    for (const [error, expected] of cases) {
        let status, body;
        const res = { setHeader() {}, status(value) { status = value; return this; }, json(value) { body = value; } };
        ErrorHandler(error, {}, res, assert.fail);
        assert.equal(status, expected); assert.ok(body.request_id); assert.ok(!JSON.stringify(body).includes('secret'));
    }
});
test('custom exception metadata cannot override the HTTP contract', () => {
    const error = new AppException(HTTP.HTTP_409_CONFLICT, 'Conflict', { statusCode: 200, code: 'OK', message: 'override' });
    assert.equal(error.statusCode, 409); assert.equal(error.code, 'CONFLICT'); assert.equal(error.message, 'Conflict');
});
test('configuration coerces numeric settings and rejects invalid limits', () => {
    assert.equal(config.PORT, 3000); assert.equal(config.LOGIN_LIMIT, 100);
    const original = process.env.LOGIN_LIMIT;
    try { process.env.LOGIN_LIMIT = '-1'; assert.throws(() => config.LOGIN_LIMIT, /positive integer/); }
    finally { process.env.LOGIN_LIMIT = original; }
});
test('reset password cannot be invoked for another user', async () => {
    let failure;
    await Controllers.auth_controller.reset_password({ params: { id: '2' }, auth: { id: 1 }, body: {} }, {}, error => { failure = error; });
    assert.equal(failure.statusCode, 403);
});

test('registration hashes passwords and serializes inside a transaction', async () => {
    mock.method(Models.User, 'findOne', async () => null);
    const transaction = {};
    mock.method(sequelize, 'transaction', async callback => callback(transaction));
    mock.method(Models.User, 'create', async (values, options) => {
        assert.equal(options.transaction, transaction);
        assert.ok(await bcrypt.compare('secret123', values.password));
        assert.equal(values.confirm_password, undefined);
        return user;
    });
    const result = await request('/api/v1/auth/register', post({ username: 'tester', name: 'Tester', email: 'test@example.com', password: 'secret123', confirm_password: 'secret123' }));
    assert.equal(result.status, 201); assert.equal(result.body.data.password, undefined);
});

test('Swagger describes the actual protected users and auth routes', async () => {
    const response = await request('/swagger-docs.json');
    assert.ok(response.body.paths['/api/v1/auth/login'].post);
    assert.deepEqual(response.body.paths['/api/v1/users'].get.security, [{ bearerAuth: [] }]);
    assert.ok(response.body.paths['/api/v1/users/{id}'].get.responses['422']);
});

test('login limiter returns consistent JSON 429 with retry headers', async () => {
    let result;
    for (let i = 0; i < 101; i++) {
        result = await request('/api/v1/auth/login', post({}));
        if (result.status === 429) break;
    }
    assert.equal(result.status, 429);
    assert.equal(result.body.code, 'TOO_MANY_REQUESTS');
    assert.ok(result.body.request_id); assert.ok(result.headers.get('retry-after'));
});
