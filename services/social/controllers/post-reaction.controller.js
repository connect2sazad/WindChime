import { fn, col, Op } from 'sequelize';
import BaseController from './base.controller.js';
import Schemas from '../schemas/registry.js';
import Models from '../models/registry.js';
import utils from '../utils/registry.js';
import errors from '../errors/registry.js';

class PostReactionController extends BaseController {

    constructor() {

        const settings = {
            schema: Schemas.ReactionSchemas.PostReactionSchema,
            parents: [
                {
                    param: 'post_id',
                    field: 'post_id',
                    model: Models.Post,
                }
            ],
        }

        super(Models.PostReaction, settings);
    }

    async people(req, res, next) {
        try {
            this.isAuthorized(req);
            const schema = Schemas.Pagination.PaginationSchema.pick({ page: true, limit: true })
                .extend({ type: Schemas.ReactionSchemas.ReactionTypeSchema.optional() }).strict();
            const { page, limit, type } = utils.Validations.parseRequest(schema, req.query);
            const offset = (page - 1) * limit;
            if (!Number.isSafeInteger(offset)) throw new errors.ValidationException('Page number is too large');
            const { post_id } = await this.getScope(req);
            const { count, rows } = await this.model.findAndCountAll({
                where: { post_id, ...(type ? { type } : {}), ...(req.blockedUserIds?.length?{creator_id:{[Op.notIn]:req.blockedUserIds}}:{}) },
                attributes: ['id', 'creator_id', 'type', 'created_at'],
                order: [['id', 'DESC']], limit, offset,
            });
            return res.status(200).json({ success: true, data: rows.map(row => row.toJSON()),
                pagination: { page, limit, total: count, has_next_page: page * limit < count } });
        } catch (error) { return next(error); }
    }

    async getMine(req, res, next) {
        try {

            this.isAuthorized(req);

            const { post_id } = await this.getScope(req);

            const reaction = await this.model.findOne({
                where: {
                    post_id,
                    creator_id: req.auth.id,
                },
            });

            return res.status(200).json(
                utils.helpers.structurize_response(true, 'Your reaction retrieved', {
                    reaction: reaction ? this.serialize(reaction) : null,
                })
            );

        } catch (e) {
            return next(e);
        }
    }

    async summary(req, res, next) {
        try {
            this.isAuthorized(req);

            const { post_id } = await this.getScope(req);

            const rows = await this.model.findAll({
                attributes: [
                    'type',
                    [fn('COUNT', col('id')), 'count'],
                ],
                where: { post_id, ...(req.blockedUserIds?.length?{creator_id:{[Op.notIn]:req.blockedUserIds}}:{}) },
                group: ['type'],
                raw: true,
            });

            const counts = {
                like: 0,
                love: 0,
                laugh: 0,
                sad: 0,
                angry: 0,
            };

            for (const row of rows) {
                if (Object.hasOwn(counts, row.type)) {
                    counts[row.type] = Number(row.count);
                }
            }

            const mine = await this.model.findOne({
                where: {
                    post_id,
                    creator_id: req.auth.id,
                },
            });

            return res.status(200).json(
                utils.helpers.structurize_response(
                    true,
                    'Reaction summary retrieved',
                    {
                        counts,
                        total: Object.values(counts).reduce(
                            (sum, count) => sum + count, 0
                        ),
                        my_reaction: mine ? this.serialize(mine) : null,
                    }
                )
            );
        } catch (error) {
            return next(error);
        }
    }

    async set(req, res, next) {
        try {

            this.isAuthorized(req);

            const { type } = utils.Validations.parseRequest(
                Schemas.ReactionSchemas.ReactionSetSchema, req.body
            )

            const post_reaction = await this.model.sequelize.transaction(async transaction => {

                const { post_id } = await this.getScope(req, transaction);
                const where = { post_id, creator_id: req.auth.id };

                let reaction = await this.model.findOne({
                    where,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                const created = !reaction;

                if (created) {
                    reaction = await this.model.create({
                        ...where,
                        type
                    }, { transaction });
                } else if (reaction.type !== type) {
                    await reaction.update({ type }, { transaction });
                }

                await reaction.reload({ transaction });

                return {
                    created,
                    data: this.serialize(reaction),
                }

            });

            return res.status(post_reaction.created ? 201 : 200).json(
                utils.helpers.structurize_response(true,
                    post_reaction.created ? 'Reaction added' : 'Reaction set',
                    post_reaction.data
                )
            );

        } catch (e) {
            return next(e);
        }
    }

    async remove(req, res, next) {
        try {

            this.isAuthorized(req);

            await this.model.sequelize.transaction(async transaction => {

                const { post_id } = await this.getScope(req, transaction);

                await this.model.destroy({
                    where: {
                        post_id,
                        creator_id: req.auth.id,
                    },
                    transaction,
                });

            });

            return res.status(204).send();

        } catch (e) {
            return next(e);
        }
    }

}

export default PostReactionController;