import Schemas from '../schemas/registry.js';
import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';

class PostController extends BaseController {

    constructor(){

        const settings = {
            schema: Schemas.Post.PostSchema,
            createSchema: Schemas.Post.PostCreateSchema,
            updateSchema: Schemas.Post.PostUpdateSchema,
            creator: true,
            includes: [],
            searchFields: [
                'content'
            ],
            idParam: 'post_id',
        }

        super(Models.Post, settings);

    }

    async getOwnedPost(req){

        if(!req.auth) throw new errors.UnauthorizedException();

        const post = await super.getRecord(req);

        if(post.creator_id !== req.auth.id){
            throw new errors.ForbiddenException('You are not authroized to modify this post!')
        }

        return post;
    }
  
}

export default PostController;