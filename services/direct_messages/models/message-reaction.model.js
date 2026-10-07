import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
export default sequelize.define('MessageReaction',{id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},message_id:{type:DataTypes.INTEGER,allowNull:false},creator_id:{type:DataTypes.INTEGER,allowNull:false},type:{type:DataTypes.ENUM('like','love','laugh','sad','angry'),allowNull:false}},{tableName:'message_reactions',timestamps:true,createdAt:'created_at',updatedAt:'updated_at'});
