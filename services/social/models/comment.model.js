import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
import BaseModel from './base.model.js';

const Comment = sequelize.define('Comment',
    {
        ...BaseModel.BaseFields,

        creator_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        post_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        content: {
            type: DataTypes.STRING(2000),
            allowNull: false,
        },

    },
    {
        ...BaseModel.BaseOptions,
        tableName: 'comments',
    }
);

export default Comment;