import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const SavedPost = sequelize.define('SavedPost', {
    id: { type: DataTypes.INTEGER, allowNull: false, autoIncrement: true, primaryKey: true },
    creator_id: { type: DataTypes.INTEGER, allowNull: false },
    post_id: { type: DataTypes.INTEGER, allowNull: false },
}, {
    tableName: 'saved_posts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default SavedPost;
