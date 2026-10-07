import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const PostRepost = sequelize.define('PostRepost', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    post_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'post_reposts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
});

export default PostRepost;