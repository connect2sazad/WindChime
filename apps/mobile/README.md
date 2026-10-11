# WindChime Mobile

Expo Router app for Android, iOS, and the Expo web preview. The first working slice includes username/password sign-in, email-code registration, secure native session storage, a cursor-paginated social feed, a searchable conversations list, and text messaging.

## Run locally

1. Copy `.env.example` to `.env`.
2. Expo Go on a physical phone needs the computer's LAN IPv4 address, not `localhost` or Android emulator's `10.0.2.2`. Set `EXPO_PUBLIC_API_HOST` to that address in `.env` and keep both devices on the same Wi-Fi. If it is omitted, the app tries to use Expo's detected LAN host; use the explicit setting if your network does not expose that address. Keep the identity, social, direct-message, and notification services running on ports 3101–3104, and allow those ports through the development machine's firewall.
3. Run `npm install` if dependencies are not installed, then `npx expo start`.
4. Run `npx expo start --clear`, scan the new QR code with Expo Go, and sign in. If the computer's Wi-Fi address changes, update `.env` and restart Metro.

Do not put credentials or private API keys in `EXPO_PUBLIC_*`; Expo embeds these values in the client. The mobile app sends a bearer token only to the configured WindChime APIs. Native sessions use Expo SecureStore; browser preview uses local storage.

## Current scope

The mobile client now includes sign-in and email-code registration, network/discover feeds with cursor pagination, protected photo/video playback, post likes and reshares, comments and replies, text/photo/reel creation, people search and friend/follow actions, notifications, profile editing, and a searchable text-message inbox. This is still an MVP: test it on a real Expo Go device, and do not treat an Android JavaScript export as proof that all API flows work against your running services. Advanced mobile chat actions, avatar upload, and end-to-end device testing remain unfinished.
