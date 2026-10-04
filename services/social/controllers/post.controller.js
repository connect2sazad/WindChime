import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';

class PostController extends BaseController {
    constructor() {
        super(Models.Post, {
            schema: Schemas.Post.PostSchema,
            createSchema: Schemas.Post.PostCreateSchema,
            updateSchema: Schemas.Post.PostUpdateSchema,
            creator: true, ownerOnly: true, includes: [],
            searchFields: ['content'], idParam: 'post_id',
        });
    }
}
export default PostController;
