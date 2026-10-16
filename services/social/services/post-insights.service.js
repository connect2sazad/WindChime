import { randomUUID } from 'node:crypto';
import Models from '../models/registry.js';

export function recordPostInsightEvent({ post_id, actor_id, event_type, source = 'unknown', transaction }) {
    return Models.PostInsightEvent.create({
        post_id,
        actor_id,
        event_type,
        source,
        event_key: randomUUID(),
    }, { transaction });
}
