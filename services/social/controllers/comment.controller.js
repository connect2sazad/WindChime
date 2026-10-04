import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';

class CommentController extends BaseController {
    constructor() {
        super(Models.Comment, {
            schema: Schemas.Comment.CommentSchema,
            createSchema: Schemas.Comment.CommentCreateSchema,
            updateSchema: Schemas.Comment.CommentUpdateSchema,
            creator: true, ownerOnly: true, includes: [],
            searchFields: ['content'], idParam: 'comment_id',
            parents: [{ param: 'post_id', field: 'post_id', model: Models.Post }],
        });
    }

    async requireParent(post_id, parent_id, transaction) {
        const parent = await this.model.findOne({
            where: { id: parent_id, post_id, },
            transaction,
            ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
        });
        if (!parent) throw new errors.NotFoundException('Top-level parent comment not found in this post');
        if(parent.parent_id !== null) throw new errors.ValidationException('Replies to replies are not supported.')
        return parent;
    }

    async prepareCreate(req, values, transaction) {
        if (values.parent_id !== null) {
            await this.requireParent(values.post_id, values.parent_id, transaction);
        }
        return values;
    }

    async getListScope(req) {
        const { parent_id } = utils.Validations.parseRequest(
            Schemas.Comment.CommentListFilterSchema, req.query
        );
        const scope = await super.getListScope(req);
        if (parent_id !== null) await this.requireParent(scope.post_id, parent_id);
        return { ...scope, parent_id };
    }

    async getRecord(req, options = {}) {
        const record = await super.getRecord(req, options);
        if (record.parent_id != null) {
            await this.requireParent(record.post_id, record.parent_id, options.transaction);
        }
        return record;
    }
}
export default CommentController;
