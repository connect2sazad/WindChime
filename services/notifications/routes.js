/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : root.js
 *  Module        : Routing
 *  Type          : Root Router
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines the application's root router and aggregates all application
 *  routes before they are registered with the Express application.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Define the root API endpoint
 *  - Register application route modules
 *  - Provide a central router for the Express application
 *  - Forward requests to the appropriate route modules
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import express from 'express';

import utils from './utils/registry.js';
import config from './config/config.js';

// routes
import routes from './routes/registry.js';

const router = express.Router();

router.get('/', (req, res) => {
    return res.status(
        utils.HTTP_STATUS.HTTP_200_OK.status_code
    ).json({
        success: true,
        message: "Express App is working!",
        swagger_docs: `http://127.0.0.1:${config.PORT}/swagger-docs/`,
        swagger_json: `http://127.0.0.1:${config.PORT}/swagger-docs.json`
    });
});

router.use(routes.health);

// other api
router.use(config.API_PREFIX, routes.auth);
router.use(config.API_PREFIX, routes.users);


export default router;