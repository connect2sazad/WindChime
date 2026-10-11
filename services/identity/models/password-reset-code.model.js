import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';

const PasswordResetCode = sequelize.define('PasswordResetCode', {
    id: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    code_hash: { type: DataTypes.STRING(64), allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
    tableName: 'password_reset_codes',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

export default PasswordResetCode;
