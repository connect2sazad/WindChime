# WindChime Web

WindChime Web is a React single-page app built with Vite. The source is organized by feature so pages, API calls, and UI pieces for one area stay together.

## Run the app

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env` and set the service URLs for your machine.
3. Start the frontend with `npm run dev`.

Vite reads `.env` when it starts. Restart the dev server after changing those values. Variables beginning with `VITE_` are included in the browser bundle, so use them for public configuration such as service base URLs, never passwords or private service tokens.

## Where to edit

- `src/main.jsx` starts React and sets up browser routing.
- `src/app/App.jsx` restores the login session and chooses between sign-in and the signed-in app.
- `src/app/routes.jsx` maps browser paths to feature pages.
- `src/modules/<feature>/pages` contains full screens; `components` contains reusable pieces within a feature; `api` contains that feature's backend requests.
- `src/shared/api/request.js` holds the service URLs and the common `fetch` helper used by feature API modules.
- `src/shared/components` and `src/shared/utils` contain UI and logic reused across features.
- `src/app/styles.js` gathers stylesheets. Shared visual rules live under `src/shared/styles`; feature-specific rules live beside their feature.

To add a screen, put it in its feature's `pages` folder, export it from that feature's `index.js`, then add its path in `src/app/routes.jsx`. Put endpoint functions in that feature's `api` folder and call `apiRequest` from `src/shared/api/request.js`.

## Configuration

Set all four service base URLs in `.env`:

- `VITE_IDENTITY_API_URL`
- `VITE_SOCIAL_API_URL`
- `VITE_MESSAGES_API_URL`
- `VITE_NOTIFICATIONS_API_URL`

Each value should include the API prefix, for example `http://localhost:3101/api/v1`. The app reports a clear error if one is missing.

## Useful commands

- `npm run dev` starts the development server.
- `npm run build` creates the production bundle in `dist`.
- `npm run lint` checks JavaScript and JSX rules.
- `npm test` runs the API and UI logic tests.
- `npm run format` formats source and test files.
- `npm run format:check` checks formatting without changing files.
