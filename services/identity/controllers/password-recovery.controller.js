import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import sequelize from '../config/sequelize.js';
import { getEnv } from '../config/config.js';
import Models from '../models/registry.js';
import Schemas from '../schemas/registry.js';
import { parseRequest } from '../utils/validation.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import Mail from '../services/mail.service.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const INVALID_CODE_MESSAGE = 'The recovery code is invalid or expired';

function hashCode(id, code) {
    return createHmac('sha256', getEnv('EMAIL_CODE_SECRET')).update(`${id}:${code}`).digest('hex');
}

class PasswordRecoveryController {
    async request(req, res, next) {
        try {
            const { email } = parseRequest(Schemas.PasswordRecoveryRequestSchema, req.body);
            const user = await Models.User.findOne({
                where: { email, status: true },
                attributes: ['id', 'email'],
            });

            if (user) {
                const id = randomUUID();
                const code = String(randomInt(100000, 1000000));
                const reset = await sequelize.transaction(async (transaction) => {
                    const current = await Models.User.findByPk(user.id, {
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    });
                    if (!current || !current.status) return null;
                    await Models.PasswordResetCode.destroy({
                        where: { user_id: current.id },
                        transaction,
                    });
                    return Models.PasswordResetCode.create({
                        id,
                        user_id: current.id,
                        code_hash: hashCode(id, code),
                        expires_at: new Date(Date.now() + CODE_TTL_MS),
                        attempts: 0,
                    }, { transaction });
                });

                if (reset) {
                    try {
                        await Mail.sendPasswordReset(user.email, code, id);
                    } catch {
                        await Models.PasswordResetCode.destroy({ where: { id } }).catch(() => {});
                        // Keep the same public response for unknown accounts and delivery failures.
                        console.error('Password recovery email delivery failed');
                    }
                }
            }

            return res.status(202).json(utils.helpers.structurize_response(
                true,
                'If an account matches this email, a recovery code has been sent.',
            ));
        } catch (error) {
            return next(error);
        }
    }

    async complete(req, res, next) {
        try {
            const { email, code, password } = parseRequest(
                Schemas.PasswordRecoveryCompleteSchema,
                req.body,
            );
            const changed = await sequelize.transaction(async (transaction) => {
                const user = await Models.User.findOne({
                    where: { email, status: true },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!user) return false;
                const reset = await Models.PasswordResetCode.findOne({
                    where: { user_id: user.id },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });
                if (!reset || reset.expires_at.getTime() <= Date.now() || reset.attempts >= 5) {
                    return false;
                }

                const expected = Buffer.from(reset.code_hash, 'hex');
                const supplied = Buffer.from(hashCode(reset.id, code), 'hex');
                if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
                    await reset.update({ attempts: reset.attempts + 1 }, { transaction });
                    return false;
                }

                const hashedPassword = await bcrypt.hash(password, 12);
                await user.update({
                    password: hashedPassword,
                    session_version: (user.session_version ?? 0) + 1,
                }, { transaction });
                await reset.destroy({ transaction });
                return true;
            });

            if (!changed) throw new errors.ValidationException(INVALID_CODE_MESSAGE);
            return res.status(200).json(utils.helpers.structurize_response(
                true,
                'Password updated. Sign in again with your new password.',
            ));
        } catch (error) {
            return next(error);
        }
    }
}

export default new PasswordRecoveryController();
