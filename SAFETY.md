# WindChime blocking, reporting and moderation

## Staff access

Every existing and new account defaults to role user. Registration/profile edits cannot assign roles. Moderation authority is read from the Identity database on each authenticated request, never from client fields or JWT role claims. No existing account was automatically promoted.

In services/identity run: npm run admin:grant -- YOUR_USERNAME

To assign a moderator instead: npm run admin:grant -- YOUR_USERNAME moderator

To remove staff access: npm run admin:grant -- YOUR_USERNAME user

These are local operator commands, not public APIs. Reload/sign in after granting a role so the navigation reflects it. Admins/moderators can open /moderation; API checks remain authoritative even if someone manually opens that URL. Staff cannot inspect or decide reports about themselves. Staff accounts cannot be suspended through report actions, and users cannot suspend themselves. Only admins can restore accounts.

## Blocking

On another profile use Block account and confirm. To unblock, use their profile or /settings/blocked (also available in navigation). Blocking is directional for ownership, but interaction restrictions apply in both directions. Blocking removes the friendship and follows in both directions. Unblocking removes only your block and never restores those connections; it cannot remove someone else’s block.

Social excludes blocked authors before feed/comment pagination and denies direct post/media/reaction access. Friend requests, follows, replies and reaction routes enforce target relationships server-side. Direct Messages checks the Social relationship on sends, reads, media, replies, forwards and reactions. An accepted friendship cannot override a block. Notification lists/counts hide blocked actors using the authoritative Social block graph; an unavailable safety check fails closed. Already downloaded content cannot be revoked from someone’s browser, and requests already in progress may finish before a new block takes effect.

## Reports

Report posts through their options menu; report comments/replies through their options menu; report an account on its profile; report a received message from its chat menu. Reasons include spam, harassment, hate, sexual content, violence, scams, privacy and other, with up to 1000 characters of explanation. Users cannot report their own content or account. One report per reporter/target is retained and duplicate submissions return the existing report. Submission is limited to 20 requests/hour/account.

Report ownership and target author are resolved on the server. Targets cannot read reports or learn the reporter through any ordinary-user endpoint. The moderation queue is staff-only and contains a snapshot of the reported content. A message report explicitly shares that message text/attachment references with staff; staff media access is scoped to the reported message, not arbitrary conversations. Media is fetched on demand using authenticated private endpoints, without publishing storage paths. Deleted attachments may no longer be available.

## Decisions and audit

Staff may dismiss a report, hide a post/comment, or suspend the reported account. Hiding removes content from normal reads and prevents further interactions with that content; hiding a parent comment hides its reply thread. Suspension changes Identity account status and disables existing tokens on the next authenticated request. It does not delete all historical content; hide abusive items separately when needed. Admins can restore an account from its suspension report. Every decision requires a reason of at least 10 characters and records actor, time, action and an idempotency UUID. Account actions also have an Identity audit record so cross-service retries are traceable. Suspensions are sent to Identity synchronously; if Identity changes status but the Social transaction fails, retry the same decision ID to finish the report without applying a conflicting action.

## API

Social, Identity Bearer token:
- GET /api/v1/blocks?page=1
- GET /api/v1/blocks/ids
- PUT /api/v1/blocks/:user_id
- DELETE /api/v1/blocks/:user_id
- POST /api/v1/reports with target_type, target_id, reason, details; message reports also require conversation_id
- GET /api/v1/moderation/capabilities
- GET /api/v1/moderation/reports?page=1&status=open (staff)
- GET /api/v1/moderation/reports/:id (staff)
- GET /api/v1/moderation/reports/:id/history (staff)
- GET /api/v1/moderation/reports/:id/media/:media_id (staff)
- PATCH /api/v1/moderation/reports/:id with action, note, decision_id (staff)

Identity: PATCH /api/v1/moderation/users/:id/status with active, note, decision_id (staff).

Deployment: configure DIRECT_MESSAGES_URL in Social and SOCIAL_URL in Notifications when service addresses differ from localhost. Apply 20261008100000-add-moderation-roles.cjs in Identity and 20261008100000-create-safety-and-moderation.cjs in Social before restarting. Database backups were saved to the Windows temporary directory under windchime-safety-backups.

Verification includes direct API block attempts, report privacy, role-claim spoofing, moderation hiding/audits, duplicate decisions, suspension and restoration using temporary test accounts. Temporary accounts/content/reports are removed after smoke tests. UI interaction still requires browser verification.
