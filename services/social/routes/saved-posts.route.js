import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();
router.get('/saved-posts', Middlewares.identityAuth, (req, res, next) => Controllers.saved_post_controller.list(req, res, next));
router.get('/posts/:post_id/saved', Middlewares.identityAuth, (req, res, next) => Controllers.saved_post_controller.mine(req, res, next));
router.put('/posts/:post_id/saved', Middlewares.identityAuth, (req, res, next) => Controllers.saved_post_controller.set(req, res, next));
router.delete('/posts/:post_id/saved', Middlewares.identityAuth, (req, res, next) => Controllers.saved_post_controller.remove(req, res, next));

export default router;
