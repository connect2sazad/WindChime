'use strict';
const { createHash } = require('node:crypto');
module.exports = {
    async up(queryInterface, Sequelize) {
        const columns = await queryInterface.describeTable('token_blacklist');
        if (!columns.expires_at) await queryInterface.addColumn('token_blacklist', 'expires_at', { type: Sequelize.DATE, allowNull: true });
        if (!columns.token_hash) await queryInterface.addColumn('token_blacklist', 'token_hash', { type: Sequelize.STRING(64), allowNull: true });
        // Existing revoked tokens remain revoked. Work in pages to bound memory use.
        let lastId = 0;
        for (;;) {
            const rows = await queryInterface.select(null, 'token_blacklist', {
                attributes: ['id','token'], where: { id: { [Sequelize.Op.gt]: lastId } }, order: [['id','ASC']], limit: 500
            });
            if (!rows.length) break;
            for (const row of rows) await queryInterface.bulkUpdate('token_blacklist', {
                token_hash: createHash('sha256').update(row.token).digest('hex')
            }, { id: row.id });
            lastId = rows.at(-1).id;
        }
        const indexes = await queryInterface.showIndex('token_blacklist');
        if (!indexes.some(index => index.name === 'token_blacklist_token_hash_unique')) {
            await queryInterface.addIndex('token_blacklist', ['token_hash'], { unique: true, name: 'token_blacklist_token_hash_unique' });
        }
        await queryInterface.changeColumn('token_blacklist', 'token_hash', { type: Sequelize.STRING(64), allowNull: false });
    },
    async down() {
        throw new Error('This security migration is forward-only: restore a database backup to roll back.');
    }
};
