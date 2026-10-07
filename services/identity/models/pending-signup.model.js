import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
const PendingSignup=sequelize.define('PendingSignup',{
 id:{type:DataTypes.STRING(36),primaryKey:true},name:DataTypes.STRING(100),username:DataTypes.STRING(50),email:DataTypes.STRING(150),
 password_hash:DataTypes.STRING(255),code_hash:DataTypes.STRING(64),expires_at:DataTypes.DATE,sent_at:DataTypes.DATE,
 attempts:{type:DataTypes.INTEGER,defaultValue:0},resends:{type:DataTypes.INTEGER,defaultValue:0},
},{tableName:'pending_signups',timestamps:true,createdAt:'created_at',updatedAt:'updated_at'});
export default PendingSignup;
