/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/base.model.js
 *  Module        : Data Models
 *  Type          : Base Model Definition
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines reusable Sequelize fields and model options that provide a
 *  consistent foundation for application models.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the shared primary key field
 *  - Define the shared model status field
 *  - Enable automatic creation and update timestamps
 *  - Configure standardized timestamp column names
 *  - Enable paranoid mode for soft deletion
 *  - Configure the soft-delete timestamp column
 *  - Enforce underscored database column naming
 *  - Provide reusable fields and options to application models
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { DataTypes } from "sequelize";

const BaseFields = {

    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
    },

    status: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    }

};

const BaseOptions = {

    timestamps: true,

    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',

    paranoid: true,

    underscored: true,

};

export default {
    BaseFields,
    BaseOptions
};