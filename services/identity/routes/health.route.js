/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : routes/health.route.js
 *  Module        : Routing
 *  Type          : Health Check Route
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines health and readiness endpoints for monitoring the operational
 *  status of the API and its database connectivity.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Provide an API health check endpoint
 *  - Provide an application readiness endpoint
 *  - Verify database connectivity during readiness checks
 *  - Report API and database availability
 *  - Return project and API version information
 *  - Return standardized health and readiness responses
 *  - Report service unavailability when the database cannot be reached
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import express from 'express';

import config from '../config/config.js';
import sequelize from '../config/sequelize.js';
import utils from '../utils/registry.js';
import ServiceUnavailableException from '../errors/ServiceUnavailableException.js';

const router = express.Router();

const HEALTH = '/health';
const READY = '/health/ready';

router.get(HEALTH, (req, res) => {
    return res.status(utils.HTTP_STATUS.HTTP_200_OK.status_code).json(
        utils.helpers.structurize_response(
            true,
            "API is ready to take requests. Check Readiness at /health/ready",
            {
                healthy: true,
                project_title: config.PROJECT_TITLE,
                api_version: config.API_VERSION,
                check_readiness: READY,
            }
        )
    );
});

router.get(READY, async (req, res, next) => {
    try {
        await sequelize.authenticate();

        return res
            .status(utils.HTTP_STATUS.HTTP_200_OK.status_code)
            .json(
                utils.helpers.structurize_response(
                    true,
                    "Database is ready and connected to take requests.",
                    {
                        ready: true,
                        database: "connected",
                        project_title: config.PROJECT_TITLE,
                        api_version: config.API_VERSION,
                    }
                )
            );
    } catch (error) {
        return next(new ServiceUnavailableException('Database readiness check failed', { cause: error }));
    }
});

export default router;
