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
import CommentController from './comment.controller.js';
import PostController from './post.controller.js';

const post_controller = new PostController();
const comment_controller = new CommentController();

const Controllers = {
    BaseController,
    post_controller,
    comment_controller,
};

export default Controllers;