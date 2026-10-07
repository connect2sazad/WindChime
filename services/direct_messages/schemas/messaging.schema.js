import { z } from '../docs/openapi.js';
export const Id=z.coerce.number().int().positive().max(2147483647);
export const Start=z.object({recipient_id:Id}).strict();
export const Send=z.object({content:z.string().trim().max(4000).default(''),client_message_id:z.uuid(),shared_post_id:Id.optional()}).strict();
export const Read=z.object({message_id:Id}).strict();
export const Inbox=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),limit:z.coerce.number().int().min(1).max(20).default(20),search:z.string().trim().max(100).default('')}).strict();
export const Cursor=z.object({before:Id.optional(),after:Id.optional(),limit:z.coerce.number().int().min(1).max(50).default(50)}).strict().refine(value=>!(value.before&&value.after),'Use before or after, not both');
