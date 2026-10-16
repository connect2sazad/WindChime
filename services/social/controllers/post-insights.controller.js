import { col, fn, Op } from 'sequelize';
import { z } from '../docs/openapi.js';
import Models from '../models/registry.js';
import Schemas from '../schemas/registry.js';
import errors from '../errors/registry.js';
import utils from '../utils/registry.js';
import { visibleRecord } from '../services/safety.service.js';

const EventSchema = z.object({
    event_type: z.enum(['view', 'profile_open', 'message_share']),
    source: z.enum(['feed', 'reel', 'profile', 'saved']).default('feed'),
    event_key: z.string().min(8).max(64).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
const PeriodSchema = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() }).strict();

class PostInsightsController {
    async track(req, res, next) {
        try {
            const post_id = utils.Validations.parseRequest(Schemas.Base.ParamsIdSchema, { id: req.params.post_id }).id;
            const input = utils.Validations.parseRequest(EventSchema, req.body);
            const post = await Models.Post.findOne({ where: { id: post_id, status: true } });
            if (!post) throw new errors.NotFoundException('Post not found');
            visibleRecord(req, post);
            if (['view', 'profile_open'].includes(input.event_type) && post.creator_id === req.auth.id) {
                return res.status(200).json({ success: true, message: 'Creator activity is not included in audience insights', data: { recorded: false } });
            }
            const created = await Models.Post.sequelize.transaction(async (transaction) => {
                const [, wasCreated] = await Models.PostInsightEvent.findOrCreate({
                    where: { actor_id: req.auth.id, post_id, event_type: input.event_type, event_key: input.event_key },
                    defaults: { actor_id: req.auth.id, post_id, ...input }, transaction,
                });
                if (wasCreated && input.event_type === 'view') await post.increment('views_count', { by: 1, transaction });
                return wasCreated;
            });
            return res.status(200).json({ success: true, message: 'Insight event recorded', data: { recorded: created } });
        } catch (error) { return next(error); }
    }

    async get(req, res, next) {
        try {
            const post_id = utils.Validations.parseRequest(Schemas.Base.ParamsIdSchema, { id: req.params.post_id }).id;
            const { from, to } = utils.Validations.parseRequest(PeriodSchema, req.query);
            if (from && to && from > to) throw new errors.ValidationException('The start date must be before the end date');
            const post = await Models.Post.findOne({ where: { id: post_id, status: true } });
            if (!post || post.creator_id !== req.auth.id) throw new errors.NotFoundException('Post insights not found');

            const dateFilter = {};
            if (from || to) dateFilter.created_at = {
                ...(from ? { [Op.gte]: new Date(`${from}T00:00:00.000Z`) } : {}),
                ...(to ? { [Op.lt]: new Date(`${to}T00:00:00.000Z`) } : {}),
            };
            const eventWhere = { post_id, ...dateFilter };
            const [events, uniqueViewers, reactions, saves, reshares, comments, engagedAccounts] = await Promise.all([
                Models.PostInsightEvent.findAll({
                    attributes: ['event_type', 'source', [fn('COUNT', col('id')), 'total']],
                    where: eventWhere, group: ['event_type', 'source'], raw: true,
                }),
                Models.PostInsightEvent.count({ where: { ...eventWhere, event_type: 'view' }, distinct: true, col: 'actor_id' }),
                Models.PostReaction.findAll({ attributes: ['type', [fn('COUNT', col('id')), 'total']], where: { post_id, ...dateFilter }, group: ['type'], raw: true }),
                Models.SavedPost.count({ where: { post_id } }),
                Models.PostRepost.count({ where: { post_id } }),
                Models.Comment.count({ where: { post_id, status: true } }),
                Models.PostInsightEvent.count({ where: { ...eventWhere, event_type: { [Op.not]: 'view' } }, distinct: true, col: 'actor_id' }),
            ]);
            const total = (type) => events.filter((row) => row.event_type === type).reduce((sum, row) => sum + Number(row.total), 0);
            const sources = {};
            for (const row of events) sources[row.source] = (sources[row.source] || 0) + Number(row.total);
            const reactionBreakdown = Object.fromEntries(reactions.map((row) => [row.type, Number(row.total)]));
            return res.status(200).json({
                success: true,
                message: 'Post insights retrieved',
                data: {
                    post_id,
                    period: { from: from || null, to: to || null },
                    views: { total: from || to ? total('view') : Number(post.views_count) || total('view'), tracked_total: total('view'), unique_viewers: uniqueViewers, by_source: Object.fromEntries(events.filter((row) => row.event_type === 'view').map((row) => [row.source, Number(row.total)])) },
                    profile_opens: total('profile_open'),
                    message_shares: total('message_share'),
                    saves: { total: total('save'), removed: total('unsave'), current: saves },
                    reshares: { total: total('reshare'), removed: total('unreshare'), current: reshares },
                    comments: { total: total('comment'), current: comments },
                    reactions: { total: total('reaction'), removed: total('unreaction'), current: Object.values(reactionBreakdown).reduce((sum, count) => sum + count, 0), by_type: reactionBreakdown },
                    engaged_accounts: engagedAccounts,
                    event_sources: sources,
                    audience_demographics: { available: false, reason: 'WindChime does not currently collect verified demographic data.' },
                },
            });
        } catch (error) { return next(error); }
    }
}

export default PostInsightsController;
