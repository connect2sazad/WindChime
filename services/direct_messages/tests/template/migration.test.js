import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import Sequelize from 'sequelize';
const require = createRequire(import.meta.url);
const migration = require('../migrations/20260919010000-repair-token-blacklist.cjs');

test('repair migration backfills existing revocations and can resume safely', async () => {
    const columns = { id: {}, token: {} }, indexes = [], updates = [];
    const qi = {
        describeTable: async () => columns,
        addColumn: async (table, name, definition) => { assert.equal(table, 'token_blacklist'); columns[name] = definition; },
        select: async (model, table, options) => options.where.id[Sequelize.Op.gt] === 0 ? [{ id: 1, token: 'existing-token' }] : [],
        bulkUpdate: async (table, values, where) => updates.push({ values, where }),
        showIndex: async () => indexes,
        addIndex: async (table, fields, options) => indexes.push({ fields, ...options }),
        changeColumn: async (table, name, definition) => { columns[name] = definition; }
    };
    await migration.up(qi, Sequelize);
    await migration.up(qi, Sequelize);
    assert.ok(columns.expires_at);
    assert.equal(columns.token_hash.allowNull, false);
    assert.equal(indexes.length, 1);
    assert.equal(indexes[0].unique, true);
    assert.equal(updates[0].values.token_hash, createHash('sha256').update('existing-token').digest('hex'));
    assert.deepEqual(updates[0].where, { id: 1 });
});

test('fresh blacklist creation never attempts a unique TEXT index', async () => {
    const create = require('../migrations/20260918035054-create-token-blacklist-table.cjs');
    await create.up({ createTable: async (table, fields) => {
        assert.equal(table, 'token_blacklist'); assert.equal(fields.token.unique, undefined);
    } }, Sequelize);
});
