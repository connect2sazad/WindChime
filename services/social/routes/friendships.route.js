import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';
import Connections from '../controllers/connections.controller.js';

const router = express.Router();
router.get('/profiles/:user_id/connections',Middlewares.identityAuth,(req,res,next)=>Connections.publicList(req,res,next));
router.get('/connections', Middlewares.identityAuth, (req,res,next)=>Connections.list(req,res,next));
router.get('/connections/:user_id', Middlewares.identityAuth, (req,res,next)=>Connections.relationship(req,res,next));
router.put('/follows/:user_id', Middlewares.identityAuth, (req,res,next)=>Connections.follow(req,res,next));
router.delete('/follows/:user_id', Middlewares.identityAuth, (req,res,next)=>Connections.unfollow(req,res,next));

const FRIENDSHIPS = '/friendships';
const FRIENDSHIPS_REQUESTS = FRIENDSHIPS + '/requests';
const FRIENDSHIPS_ID = FRIENDSHIPS + '/:friendship_id';
const FRIENDSHIPS_ID_ACCEPT = FRIENDSHIPS_ID + '/accept';
const FRIENDSHIPS_ID_REJECT = FRIENDSHIPS_ID + '/reject';
const FRIENDSHIPS_ID_CANCEL = FRIENDSHIPS_ID + '/cancel';

router.post(FRIENDSHIPS_REQUESTS, Middlewares.identityAuth, (req, res, next) => {
    return Controllers.friendship_controller.request(req, res, next);
});

router.patch(
    FRIENDSHIPS_ID_ACCEPT,
    Middlewares.identityAuth,
    (req, res, next) => {
        req.respond = 'accepted';
        Controllers.friendship_controller.respond_friendship_request(req, res, next)
    }
);

router.patch(
    FRIENDSHIPS_ID_REJECT,
    Middlewares.identityAuth,
    (req, res, next) => {
        req.respond = 'rejected';
        Controllers.friendship_controller.respond_friendship_request(req, res, next)
    }
);

router.patch(
    FRIENDSHIPS_ID_CANCEL,
    Middlewares.identityAuth,
    (req, res, next) => {
        req.respond = 'cancelled';
        return Controllers.friendship_controller.respond_friendship_request(
            req, res, next
        );
    }
);

export default router;
