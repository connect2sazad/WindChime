/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : server.js
 *  Module        : Application Core
 *  Type          : Server Entry Point
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Starts the application server and exposes the Express application
 *  on the configured port.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Load the configured Express application
 *  - Start the HTTP server on the configured port
 *  - Log the server startup information
 *  - Export the running server instance
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */
import chalk from 'chalk';
import config, { validateConfig } from './config/config.js';
import taskapp from './init.js';

validateConfig();
const server = taskapp.listen(config.PORT, () => {
    console.log(chalk.blue(`${config.PROJECT_TITLE} Server is running at http://localhost:${config.PORT}`));
});

server.on('error', error => {
    console.error('Server failed to start:', error.code || error.name);
    process.exitCode = 1;
});

export default server;