import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
export default sequelize.define('Message',{id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},conversation_id:{type:DataTypes.INTEGER,allowNull:false},sender_id:{type:DataTypes.INTEGER,allowNull:false},content:{type:DataTypes.TEXT,allowNull:false},attachments:{type:DataTypes.JSON,allowNull:true},shared_post_id:{type:DataTypes.INTEGER,allowNull:true},client_message_id:{type:DataTypes.STRING(36),allowNull:false}},{tableName:'messages',timestamps:true,createdAt:'created_at',updatedAt:false});
