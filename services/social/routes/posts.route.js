import uploadMedia from '../middlewares/upload-media.middleware.js';
import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();
router.get('/feed',Middlewares.identityAuth,(req,res,next)=>Controllers.post_controller.feed(req,res,next));
router.get('/profiles/:user_id/reshares',Middlewares.identityAuth,(req,res,next)=>Controllers.post_controller.reshares(req,res,next));

const POSTS = '/posts';
export const POSTS_ID = POSTS + '/:post_id';
export const POSTS_ID_REPOST = POSTS_ID + '/repost';
export const POSTS_ID_REACTION = POSTS_ID + '/reactions';
export const POSTS_ID_REACTION_ME = POSTS_ID_REACTION + '/me';
export const POSTS_ID_REACTION_SUMMARY = POSTS_ID_REACTION + '/summary';
export const POSTS_ID_VIEWS = POSTS_ID + '/views';
export const POSTS_ID_VIEW = POSTS_ID + '/view';

// create a new post
router.post(POSTS, Middlewares.identityAuth, uploadMedia, (req, res, next) => {
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

router.get(POSTS_ID_VIEWS, Middlewares.identityAuth, (req, res, next) => Controllers.post_controller.views(req, res, next));
router.put(POSTS_ID_VIEW, Middlewares.identityAuth, (req, res, next) => Controllers.post_insights_controller.track(req, res, next));
router.post(POSTS_ID + '/insights/events', Middlewares.identityAuth, (req, res, next) => Controllers.post_insights_controller.track(req, res, next));
router.get(POSTS_ID + '/insights', Middlewares.identityAuth, (req, res, next) => Controllers.post_insights_controller.get(req, res, next));

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

router.get(POSTS_ID_REACTION + '/people', Middlewares.identityAuth,
    (req, res, next) => Controllers.post_reaction_controller.people(req, res, next));

router.get(POSTS_ID + '/media/:media_id',Middlewares.identityAuth,(req,res,next)=>Controllers.post_controller.media(req,res,next));
router.get(POSTS_ID + '/media/:media_id/thumbnail',Middlewares.identityAuth,(req,res,next)=>Controllers.post_controller.mediaThumbnail(req,res,next));
router.get('/profiles/:user_id/posts',Middlewares.identityAuth,(req,res,next)=>Controllers.post_controller.byAuthor(req,res,next));

export default router;
