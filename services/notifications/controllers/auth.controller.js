/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : controllers/auth.controller.js
 *  Module        : Controllers
 *  Type          : Authentication Controller
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Handles application authentication operations, including user login,
 *  registration, credential verification, token generation, password reset,
 *  and logout through token revocation.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Authenticate users using submitted credentials
 *  - Validate authentication-related request data
 *  - Verify user account availability and status
 *  - Compare submitted passwords with stored password hashes
 *  - Generate authentication tokens for successful logins
 *  - Register new user accounts
 *  - Prevent duplicate usernames and email addresses
 *  - Hash passwords before storing them
 *  - Reset passwords for existing user accounts
 *  - Revoke authentication tokens during logout
 *  - Prevent duplicate token blacklist entries
 *  - Return standardized authentication responses
 *  - Forward authentication errors to centralized error handling
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
import sequelize from "../config/sequelize.js";
import Models from "../models/registry.js";
import errors from '../errors/registry.js';
import Schemas from "../schemas/registry.js";
import Middlewares from '../middlewares/registry.js';
import utils from "../utils/registry.js";

class AuthController {

    constructor() {
        this.salt = 12;
    }

    async login(req, res, next) {

        try {

            const {
                username,
                password
            } = utils.Validations.parseRequest(Schemas.Auth.LoginSchema, req.body);

            const user = await Models.User.findOne({
                where: {
                    username,
                    deleted_at: null,
                }
            });

            if (!user) {
                throw new errors.UnauthorizedException(
                    "Invalid username or password."
                );
            }

            if (!user.status) {
                throw new errors.UnauthorizedException(
                    `The account with username ${username} has been disabled. Please contact administrator for clarification.`
                );
            }

            const validate_pass = await bcrypt.compare(password, user.password);

            if (!validate_pass) {
                throw new errors.UnauthorizedException(
                    "Invalid username or password."
                );
            }

            const user_data = Schemas.Users.UserSchema.parse(user.toJSON());

            const tokend = Middlewares.JWTTokenization.generate({
                id: user_data.id,
                username: user_data.username,
                email: user_data.email
            });

            return res.status(utils.HTTP_STATUS.HTTP_200_OK.status_code).json(
                utils.helpers.structurize_response(true,
                    "Login Successful",
                    {
                        ...user_data,
                        token: tokend
                    }
                )
            );

        } catch (e) {

            next(e);

        }

    }

    async register(req, res, next) {

        try {

            const {
                username,
                name,
                email,
                password
            } = utils.Validations.parseRequest(Schemas.Auth.RegisterUserSchema, req.body);

            const existingUser = await Models.User.findOne({
                paranoid: false,
                where: {
                    [Op.or]: [
                        { email },
                        { username }
                    ],
                }
            });

            if (existingUser) {
                throw new errors.ConflictException(
                    'Username or Email Id already exists'
                );
            }

            const hashed_password = await bcrypt.hash(password, this.salt);

            const user_data = await sequelize.transaction(async transaction => {
                const user = await Models.User.create({
                name,
                username,
                password: hashed_password,
                email
                }, { transaction });
                return Schemas.Users.UserSchema.parse(user.toJSON());
            });

            return res.status(utils.HTTP_STATUS.HTTP_201_CREATED.status_code).json(
                utils.helpers.structurize_response(true,
                    "Registration Successful",
                    {
                        ...user_data,
                    }
                )
            );

        } catch (e) {

            next(e);

        }

    }

    async reset_password(req, res, next) {

        try {

            const { id } = utils.Validations.parseRequest(Schemas.Base.ParamsIdSchema, req.params);

            if (!req.auth) throw new errors.UnauthorizedException();
            if (req.auth.id !== id) throw new errors.ForbiddenException();
            const { password } = utils.Validations.parseRequest(Schemas.Auth.PasswordResetSchema, req.body);

            const user = await Models.User.findByPk(id);

            if (!user) {
                throw new errors.NotFoundException(
                    `No such user found!`
                );
            }

            if (!user.status) {
                throw new errors.UnauthorizedException(
                    `This account has been disabled. Please contact administrator for clarification.`
                );
            }

            const hashed_password = await bcrypt.hash(password, this.salt);

            await user.update({
                password: hashed_password
            });

            const user_data = Schemas.Users.UserSchema.parse(user.toJSON());

            return res.status(utils.HTTP_STATUS.HTTP_200_OK.status_code).json(
                utils.helpers.structurize_response(true,
                    "Password Reset Successful",
                    {
                        ...user_data,
                    }
                )
            );


        } catch (e) {

            next(e);

        }

    }

    async logout(req, res, next) {

        try {
            const token = req.token;

            if (!token) {
                throw new errors.UnauthorizedException(
                    'Authentication token is required'
                );
            }

            const token_hash = createHash('sha256').update(token).digest('hex');
            await Models.TokenBlacklist.findOrCreate({
                where: { token_hash },
                defaults: { token, token_hash, user_id: req.auth.id, expires_at: new Date(req.auth.exp * 1000) }
            });
            return res.status(200).json(utils.helpers.structurize_response(true, 'Logout Successful'));
        } catch (e) {

            next(e);

        }
    }

}

export default AuthController;