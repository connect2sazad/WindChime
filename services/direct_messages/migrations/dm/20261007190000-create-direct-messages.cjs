'use strict';
module.exports = {
    async up(q, S) {
        await q.createTable('conversations', { id: { type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false }, user_low_id: { type: S.INTEGER, allowNull: false }, user_high_id: { type: S.INTEGER, allowNull: false }, low_read_id: { type: S.INTEGER, allowNull: false, defaultValue: 0 }, high_read_id: { type: S.INTEGER, allowNull: false, defaultValue: 0 }, last_message_at: { type: S.DATE, allowNull: true }, created_at: { type: S.DATE, allowNull: false }, updated_at: { type: S.DATE, allowNull: false } });
        await q.addConstraint('conversations', { fields: ['user_low_id', 'user_high_id'], type: 'unique', name: 'conversations_pair_unique' });
        await q.addIndex('conversations', ['user_high_id', 'last_message_at']);
        await q.createTable('messages', { id: { type: S.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false }, conversation_id: { type: S.INTEGER, allowNull: false, references: { model: 'conversations', key: 'id' }, onDelete: 'CASCADE' }, sender_id: { type: S.INTEGER, allowNull: false }, content: { type: S.TEXT, allowNull: false }, client_message_id: { type: S.STRING(36), allowNull: false }, created_at: { type: S.DATE, allowNull: false } });
        await q.addConstraint('messages', { fields: ['conversation_id', 'sender_id', 'client_message_id'], type: 'unique', name: 'messages_retry_unique' });
        await q.addIndex('messages', ['conversation_id', 'id'], { name: 'messages_conversation_cursor' });
    }, async down(q) { await q.dropTable('messages'); await q.dropTable('conversations'); }
};
