import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';
import { POSTS_ID } from './posts.route.js';

const router = express.Router();

const COMMENTS = POSTS_ID + '/comments';
const COMMENTS_ID = COMMENTS + '/:comment_id';

// create a new comment
router.post(COMMENTS, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.comment_controller.create(req, res, next);
});

// // get lists of comments
// router.get(COMMENTS, Middlewares.identityAuth, (req, res, next) => {
//     return Controllers.comment_controller.getAllPaginatedRecords(req, res, next);
// });

// // get single comment
// router.get(COMMENTS_ID, Middlewares.identityAuth, (req, res, next) => {
//     return Controllers.comment_controller.get(req, res, next);
// });

// // update an existing comment
// router.patch(COMMENTS_ID, Middlewares.identityAuth, (req, res, next) => {
//     return Controllers.comment_controller.update(req, res, next);
// });

// // delete an existing comment
// router.delete(COMMENTS_ID, Middlewares.identityAuth, (req, res, next) => {
//     return Controllers.comment_controller.delete(req, res, next);
// });

export default router;