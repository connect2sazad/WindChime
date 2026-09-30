import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();

const POSTS = '/posts';
export const POSTS_ID = POSTS + '/:post_id';

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

export default router;