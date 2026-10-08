/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : config/sequelize-cli.cjs
 *  Module        : Database Configuration
 *  Type          : Sequelize CLI Configuration
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the database connection configuration used by Sequelize CLI
 *  across development, test, and production environments.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Provide database credentials to Sequelize CLI
 *  - Configure database host and port
 *  - Define the database dialect
 *  - Provide environment-specific Sequelize CLI configurations
 *  - Load database settings from the centralized application configuration
 *  - Control Sequelize CLI logging behavior
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

const { default: config } = require('./config.js');

module.exports = {
  development: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    port: Number(config.DB_PORT),
    dialect: config.DB_DIALECT,

    logging: ['true','yes'].includes(config.DB_LOGGING.toLowerCase()) ? console.log : false,
  },

  test: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    port: Number(config.DB_PORT),
    dialect: config.DB_DIALECT,

    logging: ['true','yes'].includes(config.DB_LOGGING.toLowerCase()) ? console.log : false,
  },

  production: {
    username: config.DB_USER,
    password: config.DB_PASSWORD,
    database: config.DB_NAME,
    host: config.DB_HOST,
    port: Number(config.DB_PORT),
    dialect: config.DB_DIALECT,

    logging: ['true','yes'].includes(config.DB_LOGGING.toLowerCase()) ? console.log : false,
  },
};