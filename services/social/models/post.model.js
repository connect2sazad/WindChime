import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import BaseModel from './base.model.js';

const Post = sequelize.define('Post',
    {
        ...BaseModel.BaseFields,

        kind: { type: DataTypes.ENUM('post','reel'), allowNull:false, defaultValue:'post' },
        content: {
            type: DataTypes.STRING(2000),
            allowNull: false,
        },

        creator_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        views_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

    },
    {
        ...BaseModel.BaseOptions,
        tableName: 'posts',
    }
);

export default Post;
