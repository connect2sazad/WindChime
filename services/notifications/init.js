/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : init.js
 *  Module        : Application Core
 *  Type          : Application Bootstrap
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Creates & configures Express application instance
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Registers Global Middlewares
 *  - Registers Swagger API docs
 *  - Registers Root Router
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import routes from './routes.js';
import NotFoundException from './errors/NotFoundException.js';
import swaggerSpec from './config/swagger.js';

// middlewares
import middlewares from './middlewares/registry.js';

const taskapp = express();


// =========================
// Middlewares
// =========================
taskapp.use(middlewares.ReqIdPolicy);
taskapp.use(middlewares.CorsPolicy);
taskapp.use(express.json());
taskapp.use(express.urlencoded({
    extended: true,
}));


// =========================
// Swagger
// =========================
taskapp.use('/swagger-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
}));

// json from swagger
taskapp.get('/swagger-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    return res.send(swaggerSpec);
});

// =========================
// Routes
// =========================
taskapp.use(routes);




taskapp.use((req, res, next) => next(new NotFoundException('Route not found')));
taskapp.use(middlewares.ErrorHandler);

export default taskapp;