import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
export default sequelize.define('Conversation',{id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},user_low_id:{type:DataTypes.INTEGER,allowNull:false},user_high_id:{type:DataTypes.INTEGER,allowNull:false},low_read_id:{type:DataTypes.INTEGER,defaultValue:0},high_read_id:{type:DataTypes.INTEGER,defaultValue:0},last_message_at:{type:DataTypes.DATE,allowNull:true}},{tableName:'conversations',timestamps:true,createdAt:'created_at',updatedAt:'updated_at'});
