# Registration, profiles and media

## Direct messages

The separate `services/direct_messages` service runs at localhost:3103 and uses `windchime_direct_messages`. Its schema is migrated locally. Identity and Social must be running. Open Messages in the navbar, or Message on an accepted friend's profile. Only accepted friends and conversation participants can access messages; follow/pending status is insufficient. Includes text, private photo/video attachments, original-post sharing, name/username conversation search across inbox pages, safe retries, unread counts, read receipts and paginated history. Updates use four-second polling. See `services/direct_messages/DM_SETUP.md` for startup, upload limits and API details.

Chat messages now offer Reply, Forward and React in their menu. Only the sender sees Delete, which removes the message for everyone in that conversation. Replies retain a deleted-message placeholder; forwarded copies remain independent. Reactions and deletion updates refresh across participants, including older loaded messages.

## Test registration locally

Open `/identity/new/`. Username and email availability are checked after a short typing pause. Database uniqueness remains the final authority when requests arrive concurrently.

Registration creates a pending signup, not a user. A six-digit code expires after ten minutes; five incorrect attempts exhaust it. Resending waits sixty seconds and is limited to three resends. Correct verification creates the account and signs it in. Existing accounts can still sign in without completing this new flow.

Identity currently uses `MAIL_TRANSPORT=outbox` in its private `.env`. Open the newest `.eml` file in `services/identity/.mail-outbox/` locally to read the development code. This folder is ignored by Git and is not served by the API. Outbox delivery is forbidden in production.

## Switch to Gmail or another SMTP provider

Set these values in `services/identity/.env`, then restart Identity:

```dotenv
MAIL_TRANSPORT=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-account@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=your-account@gmail.com
```

Use a Google App Password, not your normal Gmail password. Google requires 2-Step Verification and some accounts do not offer App Passwords: https://support.google.com/accounts/answer/185833

For another provider, replace the host, port, TLS setting, username, password and sender. Keep `EMAIL_CODE_SECRET` private and stable; a generated value already exists locally. Never commit `.env`. Real SMTP delivery has not been tested because credentials are absent.

## Connections

Open `/connections` for incoming requests, sent requests, friends, following, followers and people search. Request recipients can accept or decline; senders can cancel. Follow/unfollow is independent of friendship. Profile pages expose the same connection actions. The feed shows up to three incoming requests. Feed, Connections, Create and Profile share one navigation component.

Social endpoints: `GET /api/v1/connections?view=incoming|sent|friends|following|followers&page=1`, `GET /api/v1/connections/:user_id`, and `PUT`/`DELETE /api/v1/follows/:user_id`. All require authentication. Existing friendship action endpoints remain unchanged. No schema changes were needed. The pre-existing thirty-day expiry worker still requires scheduling for automatic conversion.

## Profiles and creation

Browser profiles use `/profiles/:username`, for example `/profiles/connect2sazad`. Identity resolves the username to the numeric ID; Social endpoints keep their numeric IDs. Profile links across the app use usernames and changing your username redirects to the new URL. Missing profiles offer retry and people search; Share profile uses the browser share sheet or copies the profile link.

Profiles have grouped Posts, Reels, Reshares and Connections sections with paginated filters. Reshares retain the original author; hidden and deleted originals are excluded. Pending requests remain private. The feed now offers Load more moments with retry and duplicate suppression.

Your own profile allows editing name, username and bio, and uploading, replacing or removing a picture. Pictures accept JPG/PNG/WebP up to 5 MB, are decoded and resized to 512x512 WebP, and are stored privately under Identity's ignored `uploads/avatars/` folder. The avatar migration has been applied locally after a private users backup. Preserve this folder on deployment. Other users cannot edit your profile or see your email. Email changes are not included.

`/create` replaces the feed composer. Supported uploads are up to five JPG/PNG/WebP images (10 MB each), or one MP4/WebM video (50 MB). Reels require one video. Media is stored locally under the ignored Social upload folder and requires authentication to read. Keep uploads on persistent storage when deploying. This is basic upload and playback support; transcoding, thumbnail generation, duration enforcement, CDN storage and a dedicated Reels feed are future work.

Feed captions longer than 280 characters show a preview and View more opens the full post alongside comments.

## Verification

Identity: 32 tests passed. Social: 61 tests passed. Frontend: 17 tests passed; lint and production build passed. Live local checks covered pending signup, wrong/correct code, profile editing, protected image upload, WebM Reel playback and full-post opening. Temporary verification data was removed. Database backups were saved privately before migrations.
