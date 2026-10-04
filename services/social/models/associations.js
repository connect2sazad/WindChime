/**
 * =============================================================================
 *
 *                              connect2sazad
 *
 * =============================================================================
 *
 *  File          : models/associations.js
 *  Module        : Data Models
 *  Type          : Model Association Registry
 *
 *  -----------------------------------------------------------------------------
 *  DESCRIPTION
 *  -----------------------------------------------------------------------------
 *
 *  Defines and initializes Sequelize associations between application models
 *  to establish relationships used for relational database operations.
 *
 *  -----------------------------------------------------------------------------
 *  RESPONSIBILITIES
 *  -----------------------------------------------------------------------------
 *
 *  - Import models participating in database relationships
 *  - Define associations between application models
 *  - Configure association foreign keys
 *  - Configure association aliases
 *  - Establish User and TokenBlacklist relationships
 *  - Export associated models for reuse when required
 *
 *  -----------------------------------------------------------------------------
 *
 *  Author        : connect2sazad
 *
 * =============================================================================
 */

import Post from "./post.model.js";
import Comment from "./comment.model.js";
import PostReaction from "./post-reaction.model.js";
import CommentReaction from "./comment-reaction.model.js";

Comment.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post'
});

Post.hasMany(Comment, {
    foreignKey: 'post_id',
    as: 'comments'
});

PostReaction.belongsTo(Post, {
    foreignKey: 'post_id',
    as: 'post'
});

Post.hasMany(PostReaction, {
    foreignKey: 'post_id',
    as: 'reactions'
});

CommentReaction.belongsTo(Comment, {
    foreignKey: 'comment_id',
    as: 'comment'
});

Comment.hasMany(CommentReaction, {
    foreignKey: 'comment_id',
    as: 'reactions'
});

export {
    Post,
    Comment,
    PostReaction,
    CommentReaction,
};