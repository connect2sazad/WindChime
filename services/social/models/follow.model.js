import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Follow = sequelize.define('Follow', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    follower_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    following_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'follows',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
});

export default Follow;