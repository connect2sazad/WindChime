import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();

const COMMENTS = '/posts/:post_id/comments';
const COMMENTS_ID = COMMENTS + '/:comment_id';
const COMMENTS_ID_REACTION = COMMENTS_ID + '/reactions';

// add a new comment to post
router.post(
    COMMENTS,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_controller.create(req, res, next));

// get all comments related to post
router.get(
    COMMENTS,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_controller.getAllPaginatedRecords(req, res, next)
);

// get a single comment
router.get(
    COMMENTS_ID,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_controller.get(req, res, next)
);

// update a comment on a post
router.patch(
    COMMENTS_ID,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_controller.update(req, res, next)
);

// delete a comment on a post
router.delete(
    COMMENTS_ID,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_controller.delete(req, res, next)
);

// get all comment reactions
router.get(COMMENTS_ID_REACTION, Middlewares.identityAuth, 
    (req, res, next) => Controllers.comment_reaction_controller.get(req, res, next)
);

// add comment reaction
router.put(COMMENTS_ID_REACTION, Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_reaction_controller.set(req, res, next)
);

// remove comment reaction
router.delete(COMMENTS_ID_REACTION, Middlewares.identityAuth,
    (req, res, next) => Controllers.comment_reaction_controller.remove(req, res, next)
);


export default router;