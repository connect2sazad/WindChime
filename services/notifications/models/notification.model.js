import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },
    source_service: {
        type: DataTypes.STRING(32),
        allowNull: false,
    },
    event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        validate: { isUUID: 4 },
    },
    recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
    },
    actor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
    },
    type: {
        type: DataTypes.STRING(64),
        allowNull: false,
    },
    target_type: {
        type: DataTypes.STRING(32),
        allowNull: false,
    },
    target_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 },
    },
    context: {
        type: DataTypes.JSON,
        allowNull: true,
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
    },
    occurred_at: {
        type: DataTypes.DATE,
        allowNull: false,
    },
}, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: false,
    underscored: true,
    indexes: [
        {
            name: 'notifications_event_recipient_unique',
            unique: true,
            fields: ['source_service', 'event_id', 'recipient_id'],
        },
        {
            name: 'notifications_recipient_id_index',
            fields: ['recipient_id', 'id'],
        },
        {
            name: 'notifications_unread_index',
            fields: ['recipient_id', 'read_at', 'id'],
        },
    ],
});

export default Notification;