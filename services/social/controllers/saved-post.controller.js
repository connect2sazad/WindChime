import BaseController from './base.controller.js';
import Models from '../models/registry.js';
import errors from '../errors/registry.js';
import { visibleRecord } from '../services/safety.service.js';
import { Op } from 'sequelize';

class SavedPostController extends BaseController {
    constructor() { super(Models.SavedPost, { idParam: 'post_id' }); }

    async set(req, res, next) {
        try {
            this.isAuthorized(req);
            const post_id = this.parseId(req.params.post_id);
            const post = await Models.Post.findOne({ where: { id: post_id, status: true } });
            if (!post) throw new errors.NotFoundException('Post not found');
            visibleRecord(req, post);
            const [saved] = await this.model.findOrCreate({
                where: { creator_id: req.auth.id, post_id },
                defaults: { creator_id: req.auth.id, post_id },
            });
            return res.status(200).json({ success: true, message: 'Moment saved', data: { saved: true, post_id, saved_at: saved.created_at } });
        } catch (error) { return next(error); }
    }

    async remove(req, res, next) {
        try {
            this.isAuthorized(req);
            const post_id = this.parseId(req.params.post_id);
            await this.model.destroy({ where: { creator_id: req.auth.id, post_id } });
            return res.status(200).json({ success: true, message: 'Moment removed from saved', data: { saved: false, post_id } });
        } catch (error) { return next(error); }
    }

    async mine(req, res, next) {
        try {
            this.isAuthorized(req);
            const post_id = this.parseId(req.params.post_id);
            const saved = await this.model.findOne({ where: { creator_id: req.auth.id, post_id } });
            return res.status(200).json({ success: true, message: 'Saved state retrieved', data: { saved: Boolean(saved), post_id } });
        } catch (error) { return next(error); }
    }

    async list(req, res, next) {
        try {
            this.isAuthorized(req);
            const records = await this.model.findAll({
                where: { creator_id: req.auth.id },
                include: [{ model: Models.Post, as: 'post', required: true, where: { status: true, ...(req.blockedUserIds?.length ? { creator_id: { [Op.notIn]: req.blockedUserIds } } : {}) }, include: [{ model: Models.PostMedia, as: 'media' }] }],
                order: [['created_at', 'DESC']],
            });
            return res.status(200).json({
                success: true,
                message: 'Saved moments retrieved',
                data: records.map((row) => ({ ...row.post.toJSON(), saved_at: row.created_at })),
            });
        } catch (error) { return next(error); }
    }
}

export default SavedPostController;
