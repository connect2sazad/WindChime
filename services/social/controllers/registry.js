/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : controllers/registry.js
 *  Module        : Controllers
 *  Type          : Controller Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for application controllers by importing
 *  and exposing base and resource-specific controllers through a single module.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import application controller classes
 *  - Instantiate application controllers
 *  - Register shared controller instances
 *  - Provide centralized access to controller instances
 *  - Simplify controller access across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import BaseController from './base.controller.js';
import CommentReactionController from './comment-reaction.controller.js';
import CommentController from './comment.controller.js';
import FriendshipController from './friendship.controller.js';
import PostReactionController from './post-reaction.controller.js';
import PostRepostController from './post-repost.controller.js';
import PostController from './post.controller.js';
import SavedPostController from './saved-post.controller.js';

const post_controller = new PostController();
const comment_controller = new CommentController();
const post_reaction_controller = new PostReactionController();
const comment_reaction_controller = new CommentReactionController();
const friendship_controller = new FriendshipController();
const post_repost_controller =  new PostRepostController();
const saved_post_controller = new SavedPostController();

const Controllers = {
    BaseController,
    post_controller,
    comment_controller,
    post_reaction_controller,
    comment_reaction_controller,
    friendship_controller,
    post_repost_controller,
    saved_post_controller,
};

export default Controllers;
