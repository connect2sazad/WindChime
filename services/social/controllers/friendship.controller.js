import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import Schemas from '../schemas/registry.js';
import utils from '../utils/registry.js';
import errors from '../errors/registry.js';
import IdentityService from '../services/identity.service.js';

class FriendshipController extends BaseController {
    constructor() {
        super(Models.Friendship, {
            schema: Schemas.Friendship.FriendshipSchema,
        });
    }

    async request(req, res, next) {
        try {
            if (!req.auth) throw new errors.UnauthorizedException();

            const { recipient_id } = utils.Validations.parseRequest(
                Schemas.Friendship.FriendRequestSchema, req.body
            );

            const requester_id = req.auth.id;

            if (requester_id === recipient_id) {
                throw new errors.ValidationException(
                    'You cannot send yourself a friend request'
                );
            }

            await IdentityService.requireActiveUser(
                recipient_id, req.headers.authorization
            );

            const pair = {
                user_low_id: Math.min(requester_id, recipient_id),
                user_high_id: Math.max(requester_id, recipient_id),
            };

            const data = await this.model.sequelize.transaction(
                async transaction => {
                    const existing = await this.model.findOne({
                        where: pair,
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    });

                    if (existing) {
                        if (existing.status !== 'cancelled') {
                            throw new errors.ConflictException(
                                'A friendship record already exists for these users'
                            );
                        }

                        await existing.update({
                            requester_id,
                            status: 'pending',
                            requested_at: new Date(),
                            accepted_at: null,
                        }, { transaction });

                        await existing.reload({ transaction });

                        return this.serialize(existing);
                    }

                    const friendship = await this.model.create({
                        ...pair,
                        requester_id,
                        status: 'pending',
                        requested_at: new Date(),
                        accepted_at: null,
                    }, { transaction });

                    await friendship.reload({ transaction });

                    return this.serialize(friendship);
                }
            );

            return res.status(201).json(
                utils.helpers.structurize_response(
                    true, 'Friend request sent', data
                )
            );
        } catch (error) {
            return next(error);
        }
    }

    async respond_friendship_request(req, res, next) {
        try {
            if (!req.auth) throw new errors.UnauthorizedException();

            if (!['accepted', 'rejected', 'cancelled'].includes(req.respond)) {
                throw new errors.ValidationException('Invalid friendship response');
            }

            const { id } = utils.Validations.parseRequest(
                Schemas.Base.ParamsIdSchema,
                { id: req.params.friendship_id }
            );

            const data = await this.model.sequelize.transaction(
                async transaction => {
                    const friendship = await this.model.findByPk(id, {
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    });

                    if (!friendship) {
                        throw new errors.NotFoundException('Friend request not found');
                    }

                    const recipient_id =
                        friendship.requester_id === friendship.user_low_id
                            ? friendship.user_high_id
                            : friendship.user_low_id;

                    const actor_id = req.respond === 'cancelled'
                        ? friendship.requester_id
                        : recipient_id;

                    if (req.auth.id !== actor_id) {
                        throw new errors.ForbiddenException(
                            req.respond === 'cancelled'
                                ? 'Only the requester can cancel this request'
                                : 'Only the recipient can respond to this request'
                        );
                    }

                    if (friendship.status !== 'pending') {
                        throw new errors.ConflictException(
                            'This request is no longer pending'
                        );
                    }

                    const now = new Date();
                    const deadline =
                        friendship.requested_at.getTime() + 30 * 24 * 60 * 60 * 1000;

                    if (now.getTime() >= deadline) {
                        throw new errors.ConflictException(
                            'The response deadline has passed'
                        );
                    }

                    await friendship.update({
                        status: req.respond,
                        accepted_at: req.respond === 'accepted' ? now : null,
                    }, { transaction });

                    await friendship.reload({ transaction });

                    return this.serialize(friendship);
                }
            );

            return res.status(200).json(
                utils.helpers.structurize_response(
                    true,
                    'Friend request ' + req.respond,
                    data
                )
            );
        } catch (error) {
            return next(error);
        }
    }

}

export default FriendshipController;