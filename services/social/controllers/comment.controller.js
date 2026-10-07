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

    async summary(req, res, next) {
        try {
            this.isAuthorized(req);
            const { post_id } = await this.getScope(req);
            const [rows] = await this.model.sequelize.query(
                `SELECT COALESCE(c.parent_id, c.id) AS thread_id,
                    SUM(c.parent_id IS NULL) AS top_level,
                    SUM(c.parent_id IS NOT NULL) AS replies
                 FROM comments c
                 WHERE c.post_id = :post_id AND c.deleted_at IS NULL
                   AND (c.parent_id IS NULL OR EXISTS (
                       SELECT 1 FROM comments p WHERE p.id = c.parent_id
                       AND p.post_id = c.post_id AND p.parent_id IS NULL
                       AND p.deleted_at IS NULL
                   ))
                 GROUP BY COALESCE(c.parent_id, c.id)`,
                { replacements: { post_id } }
            );
            const reply_counts = {};
            let top_level = 0, replies = 0;
            for (const row of rows) {
                top_level += Number(row.top_level);
                replies += Number(row.replies);
                reply_counts[row.thread_id] = Number(row.replies);
            }
            return res.status(200).json(utils.helpers.structurize_response(
                true, 'Comment summary retrieved',
                { total: top_level + replies, top_level, replies, reply_counts }
            ));
        } catch (error) { return next(error); }
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
