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

Text messages allow 4000 characters. Enter sends; Shift+Enter adds a new line. Conversations have unread counts and Sent/Seen labels. Older history loads with a message-ID cursor. The active conversation checks for new messages every four seconds; inbox refreshes every ten seconds. This version uses HTTP polling, not WebSockets, and supports text only. It does not implement end-to-end encryption, attachments, typing indicators or push notifications.

Every conversation read, send and read receipt validates participant membership and current accepted friendship. If either source service is unavailable, access fails closed with 503. If the friendship ends, conversation access is denied and it is hidden from inbox results. Stored history remains in the database and becomes accessible again if friendship is accepted again. The friendship check and message write occur across separate services, so they are not one distributed database transaction.

Send requests require `client_message_id` (UUID). Retrying the same text with the same ID returns the original message instead of duplicating it. Reusing the ID for different text returns 409. Read receipts only advance and cannot reference another conversation.

## API

All routes below are under `/api/v1` and require the Identity Bearer token:

- `POST /conversations` — `{ "recipient_id": 2 }`
- `GET /conversations?page=1` — participant inbox, maximum 20 per page
- `GET /conversations/:id/messages` — latest 50 in chronological order
- `GET /conversations/:id/messages?before=50` — older history
- `GET /conversations/:id/messages?after=50` — new messages
- `POST /conversations/:id/messages` — `{ "content": "Hello", "client_message_id": "UUID" }`
- `PATCH /conversations/:id/read` — `{ "message_id": 50 }`

Readiness: `/health/ready`. API documentation: `/swagger-docs`.

## Verification

Messaging permission/validation tests and frontend API tests pass. Live MySQL checks covered accepted friendship, denied following/pending requests, sending, duplicate-safe retries, unread counts, read receipts, nonparticipants and cancelled friendship. Browser checks covered sending, Seen updates and mobile layout. Temporary QA data was removed after verification.
