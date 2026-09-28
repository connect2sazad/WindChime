// Compatibility exports: keep one authentication implementation.
import JWTTokenization from './jwt-tokenization.middleware.js';
export const { authenticate, generate } = JWTTokenization;
export default JWTTokenization;
