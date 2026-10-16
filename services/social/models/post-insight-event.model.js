import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const PostInsightEvent = sequelize.define('PostInsightEvent', {
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    post_id: { type: DataTypes.INTEGER, allowNull: false },
    actor_id: { type: DataTypes.INTEGER, allowNull: false },
    event_type: { type: DataTypes.ENUM('view', 'profile_open', 'message_share', 'save', 'unsave', 'reshare', 'unreshare', 'reaction', 'unreaction', 'comment'), allowNull: false },
    source: { type: DataTypes.ENUM('feed', 'reel', 'profile', 'saved', 'unknown'), allowNull: false, defaultValue: 'unknown' },
    event_key: { type: DataTypes.STRING(64), allowNull: false },
}, {
    tableName: 'post_insight_events',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

export default PostInsightEvent;
