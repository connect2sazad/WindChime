# WindChime Mobile

Expo Router app for Android, iOS, and the Expo web preview. The first working slice includes username/password sign-in, email-code registration, secure native session storage, a cursor-paginated social feed, a searchable conversations list, and text messaging.

## Run locally

1. Copy `.env.example` to `.env`.
2. For an Android emulator, set `EXPO_PUBLIC_API_HOST=10.0.2.2`. For a physical phone, replace it with the computer's LAN IPv4 address and keep both devices on the same Wi-Fi. Keep the identity, social, and direct-message services running on ports 3101, 3102, and 3103, and allow those ports through the development machine's firewall.
3. Run `npm install` if dependencies are not installed, then `npx expo start`.
4. Scan the Expo QR code with Expo Go. An Android emulator uses `10.0.2.2` when `EXPO_PUBLIC_API_HOST` is unset; an iOS simulator can use `localhost`.

Do not put credentials or private API keys in `EXPO_PUBLIC_*`; Expo embeds these values in the client. The mobile app sends a bearer token only to the configured WindChime APIs. Native sessions use Expo SecureStore; browser preview uses local storage.

## Current scope

The mobile feed supports network/discover modes, pull-to-refresh, cursor pagination, creator identity, and protected image posts. The inbox supports conversation search and text messages. Video playback, post/comment reactions, comments, media upload, profile editing, and richer message actions are not implemented in the mobile client yet; the backend and web features do not automatically provide mobile UI.
