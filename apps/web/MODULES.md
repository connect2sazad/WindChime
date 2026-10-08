# WindChime frontend modules

The frontend remains one React application. Feature modules own their pages, components, API functions, hooks and styles. Backend URLs and authentication contracts are unchanged.

## Structure

```text
src/
  app/                 App shell, signed-in routes, navigation and stylesheet composition
  modules/
    identity/          Login, registration, availability and session lifecycle
    feed/              Personalized feed page
    posts/             PostCard, creation, media, post menus and sharing
    comments/          Comments, replies and comment actions
    reactions/         Reaction icons, definitions, dialogs and post reaction API
    profiles/          Profiles, profile links, avatar loading and user API
    connections/       Friendship/follow views and actions
    messages/          Inbox, Conversation, message actions and DM API
  shared/
    api/               HTTP transport and shared API base URLs
    components/        Pure Avatar view, Icon and RelativeTime
    styles/            Base styles and the existing common social theme
    utils/             Date formatting and dialog helpers
  main.jsx             Application entry and public registration route
```

## Boundaries

- Import another feature through its public entry point (`index.js`, `api/index.js`, or a focused entry such as `posts/PostCard.js` or `profiles/Avatar.js`).
- A public API entry exports plain JavaScript request functions without importing page components. This keeps API tests usable without a browser.
- Shared code never imports feature modules or app composition.
- `PostCard` is owned by posts; Profile no longer imports it from the feed page.
- `Conversation` is separate from the Messages inbox page.
- Avatar presentation is shared; profile-picture fetching belongs to profiles.
- The existing session state and restoration logic live in `identity/hooks/useSessionController.js`, mounted by App. Registration still has its separate route and restores the verified session when returning to App.

Focused public entries avoid importing an entire route page merely to use a small widget. The JavaScript dependency graph is checked for cycles by `tests/modules.test.js`.

## Styles

`app/styles.js` composes styles in the same order as before. The built stylesheet was verified byte for byte against the pre-refactor build. The existing broad social stylesheet is shared because it styles feed cards, comments, dialogs, avatars and navigation together; feature-specific sheets stay in their feature folders.

## Personalized feed

`Your circle` shows active posts from you, accepted friends and people you follow, newest first. `Discover` shows active public posts across WindChime. Filtering happens on the server before pagination. Pending, rejected, cancelled and expired friendship records do not grant inclusion unless a separate follow relationship exists.

Endpoint: `GET /api/v1/feed?mode=network&page=1&limit=10` or `mode=discover`. The viewer always comes from the verified Identity token, never a client user ID. The older `/posts` collection endpoint remains available for existing callers.

This is a relationship-based chronological feed, not an algorithmic recommendation model. Use Refresh after changing friendships or follows while the feed is open.

## Verify

```powershell
npm run lint
npm test
npm run build
npm run dev
```

Verification included API contract tests, import resolution, shared-layer boundaries, circular-dependency checks, server-side component rendering, unchanged compiled CSS and live network/discover comparisons against the Social database. Browser interaction was not rechecked during this refactor.
