'use strict';

module.exports = {
  async up(queryInterface) {
    const statements = [
      `INSERT INTO post_insight_events (post_id, actor_id, event_type, source, event_key, created_at)
       SELECT post_id, creator_id, 'save', 'unknown', CONCAT('baseline-save-', id), created_at FROM saved_posts`,
      `INSERT INTO post_insight_events (post_id, actor_id, event_type, source, event_key, created_at)
       SELECT post_id, creator_id, 'reshare', 'unknown', CONCAT('baseline-reshare-', id), created_at FROM post_reposts`,
      `INSERT INTO post_insight_events (post_id, actor_id, event_type, source, event_key, created_at)
       SELECT post_id, creator_id, 'reaction', 'unknown', CONCAT('baseline-reaction-', id), created_at FROM post_reactions`,
      `INSERT INTO post_insight_events (post_id, actor_id, event_type, source, event_key, created_at)
       SELECT post_id, creator_id, 'comment', 'unknown', CONCAT('baseline-comment-', id), created_at FROM comments WHERE deleted_at IS NULL`,
    ];
    for (const sql of statements) await queryInterface.sequelize.query(sql);
  },
  async down(queryInterface) {
    for (const event of ['save', 'reshare', 'reaction', 'comment']) {
      await queryInterface.sequelize.query(
        `DELETE FROM post_insight_events WHERE event_key LIKE 'baseline-${event}-%'`,
      );
    }
  },
};
