# WindChime notifications

Notifications runs on port 3104 and owns windchime_notifications. Social and Direct Messages each own a notification_outbox table, added by 20261008080000-create-notification-outbox.cjs. Their schema-and-data backups were saved under the Windows temporary directory in windchime-notification-backups before migration.

## User API (Identity Bearer token)

- GET /api/v1/notifications?page=1&limit=20&unread=true — newest first; omit unread for all. Recipient always comes from verified Identity.
- GET /api/v1/notifications/unread-count
- PATCH /api/v1/notifications/:id/read — owner only; existing read timestamps are retained.
- PATCH /api/v1/notifications/read-all with {through_id: number} — bounded by a fresh snapshot of the latest notification, so newly arriving events remain unread.

## Event ingestion (service credentials only)

POST /api/v1/internal/events requires Authorization: Bearer <service token> and X-WindChime-Service: social or direct_messages. Browser login tokens cannot publish events. Each source has a separate secret. Social events cannot claim to be message events and vice versa. Event source + event UUID + recipient is unique. Self notifications are ignored.

Producer events contain IDs, event types and a timestamp, never message bodies, passwords or media URLs. Display names and avatars are resolved through Identity when the recipient views their inbox. Deleted posts and lost friendship are still enforced by Social and Direct Messages when opening a target.

## Delivery

Model hooks add outbox entries using the same transaction as comments, replies, reactions, friendships, reshares and messages. Follow.findOrCreate supplies its own transaction. No network request is made inside business transactions. Workers check due events every five seconds, use a four-second HTTP deadline, and retry with backoff capped at five minutes. Event UUIDs stay unchanged across attempts. Failed events stay in the producer database; do not truncate outboxes. Only a successful acknowledgement deletes an event. Multiple workers may deliver an event more than once; the Notifications unique index makes this safe.

Notification types: friend.request, friend.accepted, follow.created, post.comment, comment.reply, post.reaction, comment.reaction, post.reshare, message.created, message.reaction. Initial reactions notify; changing an existing reaction does not send another notification. Actions performed before this feature was installed are not backfilled. Cancelling a request or deleting an action does not erase its historical notification; a target may no longer be available.

## Frontend

/notifications provides All/Unread filters, paging, mark-all-as-read across pages, refresh, avatars and relative times. The bell and inbox poll every fifteen seconds while visible. Clicking a notification marks it read and opens the relevant conversation, connection page, username profile or full post with comments. A deleted target displays an unavailable state. This is in-app delivery, not email or browser push.

## Local and deployment configuration

Local credentials were generated into service .env files; they are not committed or displayed. In Social and Direct Messages: NOTIFICATIONS_URL=http://localhost:3104 and NOTIFICATIONS_TOKEN=<unique source token>. In Notifications: NOTIFICATIONS_SOCIAL_TOKEN and NOTIFICATIONS_DIRECT_MESSAGES_TOKEN must match the corresponding source. IDENTITY_URL remains http://localhost:3101. Frontend may override VITE_NOTIFICATIONS_API_URL (default http://localhost:3104/api/v1).

During deployment set fresh random service tokens in your secret manager, use HTTPS/service network addresses, configure allowed browser origins, apply migrations before starting producers, and keep internal ingestion inaccessible from the public internet where possible. Restart producers after changing their environment.

Copied Identity-only tests were preserved under services/notifications/tests/legacy rather than run as Notifications tests. They reference tables and routes owned by Identity and are not applicable to this service.

## Checks

Run npm test in services/notifications, services/social, services/direct_messages and apps/web. Frontend also supports npm run lint and npm run build. Automated tests use mock Identity/database access; live database and HTTP smoke checks are separate.
