import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const PostReaction = sequelize.define('PostReaction', {
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

    post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    type: {
        type: DataTypes.STRING(20),
        allowNull: false,
    }
}, {
    tableName: 'post_reactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
});

export default PostReaction;