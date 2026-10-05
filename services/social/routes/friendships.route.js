import express from 'express';
import Middlewares from '../middlewares/registry.js';
import Controllers from '../controllers/registry.js';

const router = express.Router();

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