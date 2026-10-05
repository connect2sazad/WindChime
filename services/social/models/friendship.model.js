import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Friendship = sequelize.define('Friendship', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },

    user_low_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    user_high_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    requester_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },

    status: {
        type: DataTypes.ENUM(
            'pending', 'accepted', 'rejected',
            'cancelled', 'expired'
        ),
        allowNull: false,
        defaultValue: 'pending',
    },

    requested_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    
    accepted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },

}, {
    tableName: 'friendships',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
});

export default Friendship;