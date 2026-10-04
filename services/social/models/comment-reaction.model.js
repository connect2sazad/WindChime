import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const CommentReaction = sequelize.define('CommentReaction', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },

    creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    comment_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
    }
}, {
    tableName: 'comment_reactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
});

export default CommentReaction;