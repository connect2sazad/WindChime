import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import Schemas from '../schemas/registry.js';
import utils from '../utils/registry.js';
import { Op } from 'sequelize';
import { recordPostInsightEvent } from '../services/post-insights.service.js';

class PostRepostController extends BaseController {
    constructor() {
        super(Models.PostRepost, {
            schema: Schemas.PostRepost.PostRepostSchema,
            parents: [
                {
                    param: 'post_id',
                    field: 'post_id',
                    model: Models.Post,
                },
            ],
        });
    }

    async set(req, res, next) {
        try {
            this.isAuthorized(req);

            const result = await this.model.sequelize.transaction(
                async transaction => {
                    const { post_id } = await this.getScope(req, transaction);

                    const where = {
                        post_id,
                        creator_id: req.auth.id,
                    };

                    let repost = await this.model.findOne({
                        where,
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    });

                    const created = !repost;

                    if (created) {
                        repost = await this.model.create(where, {
                            transaction,
                        });
                        await recordPostInsightEvent({ post_id, actor_id: req.auth.id, event_type: 'reshare', transaction });
                    }

                    await repost.reload({ transaction });

                    return {
                        created,
                        data: this.serialize(repost),
                    };
                }
            );

            return res.status(result.created ? 201 : 200).json(
                utils.helpers.structurize_response(
                    true,
                    result.created ? 'Post reposted' : 'Post already reposted',
                    result.data
                )
            );
        } catch (error) {
            return next(error);
        }
    }

    async remove(req, res, next) {
        try {
            this.isAuthorized(req);

            await this.model.sequelize.transaction(async transaction => {
                const { post_id } = await this.getScope(req, transaction);

                const removed = await this.model.destroy({
                    where: {
                        post_id,
                        creator_id: req.auth.id,
                    },
                    transaction,
                });
                if (removed) await recordPostInsightEvent({ post_id, actor_id: req.auth.id, event_type: 'unreshare', transaction });
            });

            return res.status(204).send();
        } catch (error) {
            return next(error);
        }
    }

    async summary(req, res, next) {
        try {
            this.isAuthorized(req);

            const { post_id } = await this.getScope(req);

            const total = await this.model.count({
                where: { post_id, ...(req.blockedUserIds?.length?{creator_id:{[Op.notIn]:req.blockedUserIds}}:{}) },
            });

            const mine = await this.model.findOne({
                where: {
                    post_id,
                    creator_id: req.auth.id,
                },
            });

            return res.status(200).json(
                utils.helpers.structurize_response(
                    true,
                    'Repost summary retrieved',
                    {
                        total,
                        reposted: Boolean(mine),
                    }
                )
            );
        } catch (error) {
            return next(error);
        }
    }
}

export default PostRepostController;
