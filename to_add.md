# WindChime feature status

## Implemented

- Email-verified registration, profiles, profile pictures, and username profile URLs
- Personalized network/discover feed, now using cursor pagination
- Posts, photo carousels, Reels/video playback, reactions, comments, replies, and reshares
- Direct messages with attachments, sharing, reply, forward, reactions, delete, search, and read receipts
- In-app notifications for social and message activity
- Blocking, reporting, and staff moderation
- Password recovery by expiring email code, with prior sessions revoked after reset
- Server-side photo orientation, metadata removal, resizing, and WebP compression

## Recommended next features

| Priority | Feature | Scope |
|---|---|---|
| 1 | Saved posts | Private bookmarks, a Saved page, and remove/organize actions |
| 2 | Post discovery | Search posts, hashtags, and mentions; add relevant results and safe pagination |
| 3 | Audience controls | Public/friends-only posts, private profiles, and visibility checks on feeds, profiles, and shared links |
| 4 | Account security | Verified email changes, active-session list/revocation, and stronger account recovery settings |
| 5 | Video pipeline | Transcoding, poster thumbnails, duration enforcement, adaptive streaming, and persistent object storage/CDN |
| 6 | Notification settings | Per-event preferences, email delivery, and mobile/browser push |
| 7 | Friendship expiry operations | Schedule and monitor the existing 30-day pending-request conversion worker |
| 8 | Production operations | Backups/restore drills, shared rate-limit storage, logs/alerts, and deployment health checks |

The mobile app is still a starter shell compared with the web app. Its authentication and social screens, real API integration, and release builds remain unfinished.
