# WindChime direct messages

The service runs on port 3103 and stores only conversations and messages in `windchime_direct_messages`. Identity (3101) verifies Bearer tokens; Social (3102) supplies the accepted friendship. JWT keys and local user registration are not used here.

## Run

From this folder:

```powershell
npm ci
npm run migrate
npm run dev
```

The migration has already been applied locally. Only `migrations/dm` is active; the original template user/token migrations and seeders were preserved but are not run. Original template tests are preserved under `tests/template`; `npm test` runs the messaging tests. Do not run the template user seeder for this service.

Configure the service's private `.env` with `PORT=3103`, `DB_NAME=windchime_direct_messages`, `IDENTITY_URL=http://localhost:3101`, `SOCIAL_URL=http://localhost:3102`, the database credentials and permitted frontend origins. For the frontend, `VITE_MESSAGES_API_URL` optionally overrides `http://localhost:3103/api/v1`.

## Use

Open Messages in the navbar, choose New message and select an accepted friend. Friend cards and profiles also offer Message. Following or a pending friend request does not enable messaging.

Text messages allow 4000 characters. Enter sends; Shift+Enter adds a new line. Use the + attachment button to choose up to five JPG/PNG/WebP images (10 MB each) or one MP4/WebM video (50 MB). Attachment previews can be removed before sending. Media is stored under the ignored `uploads/messages` folder, never served publicly; each read checks friendship and conversation membership. Preserve this folder on persistent storage when deploying. Video transcoding is not included.

The post menu offers Send in a message. Shared posts store the original post ID and are resolved through Social with the viewer's token; hidden/deleted originals show as unavailable. Conversation search matches current friend names and usernames across all inbox pages. Search metadata from Identity contains public names only, never email addresses.

Conversations have unread counts and Sent/Seen labels. Older history loads with a message-ID cursor. The active conversation checks for new messages every four seconds; inbox refreshes every ten seconds. This version uses HTTP polling, not WebSockets. It does not implement end-to-end encryption, typing indicators or push notifications.

Every conversation read, send and read receipt validates participant membership and current accepted friendship. If either source service is unavailable, access fails closed with 503. If the friendship ends, conversation access is denied and it is hidden from inbox results. Stored history remains in the database and becomes accessible again if friendship is accepted again. The friendship check and message write occur across separate services, so they are not one distributed database transaction.

Send requests require `client_message_id` (UUID). Retrying the same text with the same ID returns the original message instead of duplicating it. Reusing the ID for different text returns 409. Read receipts only advance and cannot reference another conversation.

## Chat actions

Each message has a menu for Reply, Forward, React and (for its sender) Delete. Replies may only reference an active message in the same conversation. Quotes resolve the current parent text; if its sender deletes it, the quote shows Message deleted. Reactions use the same Like/Love/Laugh/Sad/Angry types as posts, with one reaction per participant; choosing your current type removes it.

Deletion removes your message content, media and shared-post reference for everyone in that conversation. It leaves a tombstone and denies further media access. Forwarded copies remain: forwarding creates independent media files and copies only the selected message, without its original reply chain. Both source and destination must be accepted friendships. Forward retries use a UUID and cannot duplicate the copy or reuse the ID for a different source.

Loaded message IDs are refreshed in batches of 100 every poll, so changes to older loaded messages propagate as well as new messages.

Additional routes: `DELETE /conversations/:id/messages/:message_id`, `PUT`/`DELETE /conversations/:id/messages/:message_id/reaction`, `POST /conversations/:id/messages/:message_id/forward` (`recipient_id`, `client_message_id`), and `POST /conversations/:id/messages/sync` (`ids`). Sends optionally include `reply_to_id`.

## API

All routes below are under `/api/v1` and require the Identity Bearer token:

- `POST /conversations` — `{ "recipient_id": 2 }`
- `GET /conversations?page=1&search=name` — participant inbox, maximum 20 per page; name/username search
- `GET /conversations/:id/messages` — latest 50 in chronological order
- `GET /conversations/:id/messages?before=50` — older history
- `GET /conversations/:id/messages?after=50` — new messages
- `POST /conversations/:id/messages` — `{ "content": "Hello", "client_message_id": "UUID" }`
- The same send endpoint accepts multipart `media` files plus `content` and `client_message_id`, or JSON `{ "shared_post_id": 3, "client_message_id": "UUID" }`.
- `GET /conversations/:id/messages/:message_id/media/:index` — authenticated private attachment
- `GET /conversations/:id/messages/:message_id/post` — currently authorized original post
- `PATCH /conversations/:id/read` — `{ "message_id": 50 }`

Readiness: `/health/ready`. API documentation: `/swagger-docs`.

## Verification

Messaging permission/validation tests and frontend API tests pass. Live MySQL checks covered accepted friendship, denied following/pending requests, sending, duplicate-safe retries, unread counts, read receipts, nonparticipants and cancelled friendship. Browser checks covered sending, Seen updates and mobile layout. Temporary QA data was removed after verification.
