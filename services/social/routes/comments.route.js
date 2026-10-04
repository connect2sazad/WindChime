import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();

const COMMENTS = '/posts/:post_id/comments';
const COMMENTS_ID = COMMENTS + '/:comment_id';

// add a new comment to post
router.post(COMMENTS, Middlewares.identityAuth, (req,res,next) => controller.create(req,res,next));

// get all comments related to post
router.get(COMMENTS, Middlewares.identityAuth, (req,res,next) => controller.getAllPaginatedRecords(req,res,next));

// get a single comment
router.get(COMMENTS_ID, Middlewares.identityAuth, (req,res,next) => controller.get(req,res,next));

// update a comment on a post
router.patch(COMMENTS_ID, Middlewares.identityAuth, (req,res,next) => controller.update(req,res,next));

// delete a comment on a post
router.delete(COMMENTS_ID, Middlewares.identityAuth, (req,res,next) => controller.delete(req,res,next));


export default router;