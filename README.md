# Refill

React Native (Expo) + Supabase app. Base project scaffold — content to be added.

## Stack

- **Expo** (SDK 54) with **Expo Router** (file-based routing)
- **React Native** 0.81 / React 19
- **Supabase** (auth + database)
- **i18n** via `i18next` / `react-i18next` (en, tr)
- **TypeScript** (strict)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase credentials
npm run dev
```

## Environment variables

Set these in `.env` (see `.env.example`):

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Structure

```
app/                  # Expo Router routes
  _layout.tsx         # root layout + auth routing
  (auth)/             # login / sign up
  (tabs)/             # main tab navigation (home, profile)
components/           # shared UI components
hooks/                # custom hooks
lib/                  # supabase client + helpers
locales/              # i18n translation files
```

## Scripts

- `npm run dev` — start the Expo dev server
- `npm run ios` / `npm run android` — run native builds
- `npm run build:web` — export web build
