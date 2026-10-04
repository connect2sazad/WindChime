import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';

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
}
export default CommentController;
