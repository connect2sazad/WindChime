import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import BaseModel from './base.model.js';

const Post = sequelize.define('Post',
    {
        ...BaseModel.BaseFields,

        content: {
            type: DataTypes.STRING(2000),
            allowNull: false,
        },

        creator_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

    },
    {
        ...BaseModel.BaseOptions,
        tableName: 'posts',
    }
);

export default Post;