/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : utils/registry.js
 *  Module        : Application Includes
 *  Type          : Include Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for reusable application includes and
 *  utilities, allowing them to be accessed through a single import.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Centralize reusable application includes
 *  - Provide organized access to helper functions
 *  - Reduce repetitive imports throughout the application
 *  - Provide a namespace-like structure for application utilities
 *  - Simplify the registration of future include modules
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import * as helpers from './helpers.js';
import BaseMigration from './base.migration.js';
import HTTP_STATUS from './status_codes.js';
import Validations from './validation.js';

const utils = {
    helpers,
    BaseMigration,
    HTTP_STATUS,
    Validations
};

export default utils;