'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('post_insight_events', {
      id: { type: Sequelize.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
      post_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'posts', key: 'id' }, onDelete: 'CASCADE' },
      actor_id: { type: Sequelize.INTEGER, allowNull: false },
      event_type: { type: Sequelize.ENUM('view', 'profile_open', 'message_share', 'save', 'unsave', 'reshare', 'unreshare', 'reaction', 'unreaction', 'comment'), allowNull: false },
      source: { type: Sequelize.ENUM('feed', 'reel', 'profile', 'saved', 'unknown'), allowNull: false, defaultValue: 'unknown' },
      event_key: { type: Sequelize.STRING(64), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('post_insight_events', {
      fields: ['actor_id', 'post_id', 'event_type', 'event_key'],
      type: 'unique',
      name: 'post_insight_events_idempotency_unique',
    });
    await queryInterface.addIndex('post_insight_events', ['post_id', 'event_type', 'created_at'], { name: 'post_insight_events_post_type_date' });
    await queryInterface.addIndex('post_insight_events', ['post_id', 'actor_id'], { name: 'post_insight_events_post_actor' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('post_insight_events');
  },
};
