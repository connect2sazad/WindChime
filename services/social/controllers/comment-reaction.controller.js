import { fn, col } from 'sequelize';
import BaseController from './base.controller.js';
import Schemas from '../schemas/registry.js';
import Models from '../models/registry.js';
import utils from '../utils/registry.js';
import errors from '../errors/registry.js';

class CommentReactionController extends BaseController{
    
    constructor(){

        const settings = {
            schema: Schemas.ReactionSchemas.CommentReactionSchema,
            parents: [
                { param: 'post_id', model: Models.Post },
                {
                    param: 'comment_id',
                    field: 'comment_id',
                    model: Models.Comment,
                    scope: { post_id: 'post_id' },
                }
            ],
        }

        super(Models.CommentReaction, settings);
    }

    async getScope(req, transaction) {
        const scope = await super.getScope(req, transaction);
        const comment = await Models.Comment.findByPk(scope.comment_id, { transaction });
        if (!comment) throw new errors.NotFoundException('Comment not found');
        if (comment.parent_id !== null) {
            const parent = await Models.Comment.findOne({
                where: { id: comment.parent_id, post_id: comment.post_id, parent_id: null },
                transaction,
                ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
            });
            if (!parent) throw new errors.NotFoundException('Parent comment not found');
        }
        return scope;
    }

    async summary(req, res, next) {
        try {
            this.isAuthorized(req);
            const { comment_id } = await this.getScope(req);
            const rows = await this.model.findAll({
                attributes: ['type', [fn('COUNT', col('id')), 'count']],
                where: { comment_id }, group: ['type'], raw: true,
            });
            const counts = { like: 0, love: 0, laugh: 0, sad: 0, angry: 0 };
            for (const row of rows) if (Object.hasOwn(counts, row.type)) counts[row.type] = Number(row.count);
            const mine = await this.model.findOne({ where: { comment_id, creator_id: req.auth.id } });
            return res.status(200).json(utils.helpers.structurize_response(
                true, 'Comment reaction summary retrieved',
                { counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0),
                    my_reaction: mine ? this.serialize(mine) : null }
            ));
        } catch (error) { return next(error); }
    }

    async people(req, res, next) {
        try {
            this.isAuthorized(req);
            const schema = Schemas.Pagination.PaginationSchema.pick({ page: true, limit: true })
                .extend({ type: Schemas.ReactionSchemas.ReactionTypeSchema.optional() }).strict();
            const { page, limit, type } = utils.Validations.parseRequest(schema, req.query);
            const offset = (page - 1) * limit;
            if (!Number.isSafeInteger(offset)) throw new errors.ValidationException('Page number is too large');
            const { comment_id } = await this.getScope(req);
            const { count, rows } = await this.model.findAndCountAll({
                where: { comment_id, ...(type ? { type } : {}) },
                attributes: ['id', 'creator_id', 'type', 'created_at'],
                order: [['id', 'DESC']], limit, offset,
            });
            return res.status(200).json({ success: true, data: rows.map(row => row.toJSON()),
                pagination: { page, limit, total: count, has_next_page: page * limit < count } });
        } catch (error) { return next(error); }
    }

    async set(req, res, next){
        try{

            this.isAuthorized(req);

            const { type } = utils.Validations.parseRequest(
                Schemas.ReactionSchemas.ReactionSetSchema, req.body
            )

            const comment_reaction = await this.model.sequelize.transaction(async transaction => {

                const { comment_id } = await this.getScope(req, transaction);
                const where = { comment_id, creator_id: req.auth.id };

                let reaction = await this.model.findOne({
                    where,
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                const created = !reaction;

                if(created){
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

            return res.status(comment_reaction.created ? 201 : 200).json(
                utils.helpers.structurize_response(true,
                    comment_reaction.created ? 'Reaction added' : 'Reaction set',
                    comment_reaction.data
                )
            );

        } catch (e) {
            return next(e);
        }
    }

    async remove(req, res, next){
        try {

            this.isAuthorized(req);

            await this.model.sequelize.transaction(async transaction => {

                const { comment_id } = await this.getScope(req, transaction);

                await this.model.destroy({
                    where: {
                        comment_id,
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

export default CommentReactionController;