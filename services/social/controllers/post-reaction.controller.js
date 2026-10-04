import BaseController from './base.controller.js';
import Schemas from '../schemas/registry.js';
import Models from '../models/registry.js';
import utils from '../utils/registry.js';

class PostReactionController extends BaseController{
    
    constructor(){

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

    async set(req, res, next){
        try{

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

    async remove(req, res, next){
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