/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/registry.js
 *  Module        : Data Models
 *  Type          : Model Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Provides a centralized registry for Sequelize models and ensures model
 *  associations are initialized before the models are exposed to the
 *  application.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Initialize Sequelize model associations
 *  - Import application models
 *  - Register application models in a centralized collection
 *  - Provide a single access point for registered models
 *  - Simplify model imports across the application
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import './associations.js';
import Post from './post.model.js';
import PostReaction from './post-reaction.model.js';
import Comment from './comment.model.js';
import CommentReaction from './comment-reaction.model.js';
import Friendship from './friendship.model.js';
import Follow from './follow.model.js';
import PostRepost from './post-repost.model.js';

const Models = {
    Post,
    Comment,
    PostReaction,
    CommentReaction,
    Friendship,
    Follow,
    PostRepost,
};

export default Models;