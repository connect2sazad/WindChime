import { DataTypes } from 'sequelize';
import sequelize from '../config/sequelize.js';
const PostMedia=sequelize.define('PostMedia',{
 id:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},post_id:{type:DataTypes.INTEGER,allowNull:false},
 filename:{type:DataTypes.STRING(100),allowNull:false},kind:{type:DataTypes.ENUM('image','video'),allowNull:false},
 thumbnail_filename:{type:DataTypes.STRING(100),allowNull:true},
 mime_type:{type:DataTypes.STRING(50),allowNull:false},size:{type:DataTypes.INTEGER,allowNull:false},sort_order:{type:DataTypes.INTEGER,defaultValue:0},
},{tableName:'post_media',timestamps:true,createdAt:'created_at',updatedAt:'updated_at'});
export default PostMedia;
