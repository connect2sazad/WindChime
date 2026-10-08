/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : config/sequelize.js
 *  Module        : Database Configuration
 *  Type          : Sequelize Connection
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Creates and configures the Sequelize instance used by the application
 *  to communicate with the database.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Initialize the Sequelize database connection
 *  - Load database credentials from the centralized configuration
 *  - Configure the database dialect and connection settings
 *  - Configure environment-based SQL query logging
 *  - Configure the database connection pool
 *  - Provide the shared Sequelize instance to application models
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { Sequelize } from "sequelize";

import config from "./config.js";


const sequelize = new Sequelize(
    config.DB_NAME, config.DB_USER, config.DB_PASSWORD,
    {
        host: config.DB_HOST,
        port: config.DB_PORT,
        dialect: config.DB_DIALECT,

        logging: config.ENVIRONMENT === 'development' ? console.log : false,

        pool: {
            max: 10,
            min: 0,
            acquire: 30_000,
            idle: 10_000,
        },

        dialectOptions: config.DB_DIALECT === 'postgres' ? { application_name: config.PROJECT_NAME } : {}
    }
);

export default sequelize;