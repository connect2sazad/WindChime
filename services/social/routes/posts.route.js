import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();

const POSTS = '/posts';
export const POSTS_ID = POSTS + '/:post_id';
export const POSTS_ID_REPOST = POSTS_ID + '/repost';
export const POSTS_ID_REACTION = POSTS_ID + '/reactions';
export const POSTS_ID_REACTION_ME = POSTS_ID_REACTION + '/me';
export const POSTS_ID_REACTION_SUMMARY = POSTS_ID_REACTION + '/summary';

// create a new post
router.post(POSTS, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.post_controller.create(req, res, next);
});

// get lists of posts
router.get(POSTS, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.post_controller.getAllPaginatedRecords(req, res, next);
});

// get single post
router.get(POSTS_ID, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.post_controller.get(req, res, next);
});

// update an existing post
router.patch(POSTS_ID, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.post_controller.update(req, res, next);
});

// delete an existing post
router.delete(POSTS_ID, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.post_controller.delete(req, res, next);
});

// get all post reactions
router.get(POSTS_ID_REACTION, Middlewares.identityAuth, 
    (req, res, next) => Controllers.post_reaction_controller.get(req, res, next)
);

// add post reaction
router.put(POSTS_ID_REACTION, Middlewares.identityAuth,
    (req, res, next) => Controllers.post_reaction_controller.set(req, res, next)
);

// remove post reaction
router.delete(POSTS_ID_REACTION, Middlewares.identityAuth,
    (req, res, next) => Controllers.post_reaction_controller.remove(req, res, next)
);

router.put(
    POSTS_ID_REPOST,
    Middlewares.identityAuth,
    (req, res, next) =>
        Controllers.post_repost_controller.set(req, res, next)
);

router.delete(
    POSTS_ID_REPOST,
    Middlewares.identityAuth,
    (req, res, next) =>
        Controllers.post_repost_controller.remove(req, res, next)
);

router.get(
    POSTS_ID_REPOST,
    Middlewares.identityAuth,
    (req, res, next) =>
        Controllers.post_repost_controller.summary(req, res, next)
);

router.get(
    POSTS_ID_REACTION_ME,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.post_reaction_controller.getMine(req, res, next)
);

router.get(
    POSTS_ID_REACTION_SUMMARY,
    Middlewares.identityAuth,
    (req, res, next) => Controllers.post_reaction_controller.summary(req, res, next)
);

export default router;