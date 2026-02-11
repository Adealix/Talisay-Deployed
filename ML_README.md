# Talisay Oil Yield Predictor (Prototype)

Expo (React Native) app written in **JavaScript**.

## What this does

- Runs on **Expo Go (Android)** and also on **Web** (`expo start --web`).
- Prototype “ML” approach: uses **simple image color analysis** (green/yellow/brown) + optional morphology inputs (length/width/weight) to estimate a **seed-to-oil conversion ratio**.
- Stores predictions locally in **History**.

## Run locally

```bash
npx expo start
```

Or (same thing):

```bash
npm run start
```

- Press `a` to open on Android (Expo Go)
- Press `w` to open on web

### Tunnel mode (when your phone can’t reach your PC)

If your phone and your PC are on different networks (or the LAN blocks connections), run:

```bash
npx expo start --tunnel
```

Or:

```bash
npm run tunnel
```

## Build an Android APK (EAS)

This project includes an `eas.json` with an APK profile.

1) Install EAS CLI:

```bash
npm i -g eas-cli
```

2) Log in and initialize (creates the EAS project on your Expo account):

```bash
eas login
eas init
```

3) Build APK:

```bash
eas build -p android --profile preview
```

Notes:
- The Android package id is set in [app.json](app.json) as `com.schoolproject.talisayml`.
- Change that to your own unique id before a real release.

## What is ngrok and how does it relate to this project?

`ngrok` is a tunneling tool that creates a secure, public URL to a server running on your computer.

In an Expo workflow, the Metro bundler runs locally on your PC. Normally your phone connects over the same Wi‑Fi/LAN.
When that’s not possible, Expo’s `--tunnel` option uses a tunneling service so your phone can reach the dev server over the internet.

Practical takeaway:
- Use normal mode (no `--tunnel`) when phone + PC are on the same network (fastest).
- Use `--tunnel` when you have network issues or are on different networks (slower, but more reliable).

## Do we need a database?

Not for this prototype.

- This app already stores results locally using AsyncStorage (device/browser).
- You only need a database if you want shared history across devices, teacher evaluation dashboards, or collecting a dataset for real training.

If you want MongoDB Atlas later:
- Don’t connect to Atlas directly from the Expo app (you’d expose credentials).
- Create a small backend API (Node/Express or Python/FastAPI) that talks to Atlas using server-side environment variables.
- The Expo app calls your API endpoints.

## Included backend (Express + MongoDB)

This repo now includes a tiny backend in [server/index.js](server/index.js).

Important:
- Don’t commit credentials. `.env` and `server/.env` are ignored by git.

Run the backend:

```bash
cd server
npm install
```

Create `server/.env` (copy from [server/.env.example](server/.env.example)) and set `MONGODB_URI`.

Then:

```bash
npm run start
```

The Expo app will POST saved results to `EXPO_PUBLIC_API_BASE_URL` (set in [.env](.env)).

## Proposal

The proposal text is available in-app under the **Proposal** tab.
