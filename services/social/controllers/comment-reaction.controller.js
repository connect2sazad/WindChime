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