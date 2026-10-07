/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : config/config.js
 *  Module        : Application Configuration
 *  Type          : Configuration Manager
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides centralized and dynamic access to application configuration
 *  values loaded from environment variables.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Load environment variables using dotenv
 *  - Provide dynamic access to environment variables
 *  - Support optional default values through getEnv()
 *  - Validate required environment variables when accessed
 *  - Throw a standardized exception when a required value is missing
 *  - Expose environment variables through a dynamic configuration proxy
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import 'dotenv/config';
import ms from 'ms';
import ConfigurationException from '../errors/ConfigurationException.js';

export function getEnv(name, defaultValue = undefined) {
    const value = process.env[name];
    if (value !== undefined && (value.trim() !== '' || name === 'DB_PASSWORD')) return value;
    if (defaultValue !== undefined) return defaultValue;
    throw new ConfigurationException(name + ' is missing or empty');
}
const config = new Proxy({}, {
    get(target, property) {
        if (typeof property !== 'string') return target[property];
        const value = getEnv(property);
        if (['PORT', 'DB_PORT', 'LOGIN_LIMIT'].includes(property)) {
            const number = Number(value);
            if (!Number.isSafeInteger(number) || number < 1 || (property !== 'LOGIN_LIMIT' && number > 65535)) {
                throw new ConfigurationException(property + ' must be a positive integer in range');
            }
            return number;
        }
        if (property === 'JWT_EXPIRES_IN') {
            const duration = /^\d+$/.test(value) ? Number(value) : ms(value);
            if (!Number.isFinite(duration) || duration <= 0) throw new ConfigurationException('JWT_EXPIRES_IN must be a positive duration');
            return /^\d+$/.test(value) ? Number(value) : value;
        }
        if (property === 'API_PREFIX' && (!value.startsWith('/') || /[:*{}?]/.test(value))) throw new ConfigurationException('API_PREFIX must be a literal path beginning with /');
        return value;
    }
});
export function validateConfig() {
    for (const name of ['PROJECT_NAME','PROJECT_TITLE','PORT','ENVIRONMENT','API_PREFIX','API_VERSION',
        'JWT_SECRET_KEY','JWT_EXPIRES_IN','LOGIN_LIMIT','DB_DIALECT','DB_HOST','DB_NAME','DB_PORT','DB_USER','DB_PASSWORD','ALLOWED_ORIGINS']) void config[name];
}
export default config;
