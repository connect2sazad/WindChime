import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';

class CommentController extends BaseController {

    constructor(){

        const settings = {
            schema: Schemas.Comment.CommentSchema,
            createSchema: Schemas.Comment.CommentCreateSchema,
            updateSchema: Schemas.Comment.CommentUpdateSchema,
            creator: true,
            includes: [],
            idParam: 'comment_id',
        }

        super(Models.Comment, settings);

    }
  
}

export default CommentController;