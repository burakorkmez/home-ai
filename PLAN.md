# Home AI-style room redesigner: v1 spec + build plan

## Context
This is a greenfield mobile app in an empty folder. A user photographs a room, picks a room type and a style, and OpenAI redesigns the room. The user then sees a before/after comparison and finds the result later in their history. The goal is a simple, beginner-friendly MVP that works and looks professional, and that ships to the **App Store and Play Store**.

The interview settled every major decision. One change came from checking the docs: **Neon Auth has no Expo/React Native client**, so auth uses **self-hosted Better Auth stored in Neon Postgres**. Neon Auth is built on Better Auth too, and you approved this switch.

---

## 1. Spec summary

### Product & users
- **User:** homeowners and renters who want to see their room in a different style before buying anything.
- **Must do well:** a believable redesign that keeps the room's real layout (walls, windows, camera angle).
- **"Aha" moment:** the before/after slider on the first result.

### Scope
**In v1:**
- Sign-in wall: email + password, Google, and Apple (Apple button on iOS only).
- Take a photo or pick one from the gallery.
- Pick a room type and one of 8 hardcoded styles.
- Generate. The user waits on an animated loading screen.
- Before/after result screen.
- Every successful result is auto-saved to "My Designs" history.
- Quota: 5 successful generations per user per day.
- Profile screen: remaining quota, sign out, **delete account** (App Store rule), privacy policy link.
- Forgot-password email (see Assumptions).
- iOS + Android, phone only, portrait, dark theme only.

**Out of v1:** guest mode, download to Photos, share sheet, deleting individual designs, custom prompt text, paid credits, light theme, tablet, monitoring (Sentry), push notifications, background generation.

### Core flow
1. **Welcome screen** (hero before/after image) → Sign in / Sign up (email, Google, Apple).
2. **Create tab:**
   - Take or pick a photo.
   - The app shrinks it to at most 1536px JPEG.
   - The user picks a room type, then a style card.
   - Generate.
3. **Generating:** a full-screen loader with rotating tips. It shows the error message and a Retry button if the call fails. Failed attempts don't use up the quota.
4. **Result** (`/design/[id]`): a before/after slider, with the style and room labels.
5. **My Designs tab:** a grid of thumbnails, newest first, with an empty state that links to Create. Tapping a thumbnail opens the Result screen.
6. **Profile tab:** "3 of 5 left today", sign out, delete account (with a confirm step), privacy policy.

### Screens (Expo Router, under `src/` per the SDK 58 template)
```
src/app/
  _layout.tsx                 auth gate (session → tabs, none → welcome)
  welcome.tsx                 hero + sign-in buttons
  sign-in.tsx                 email/password form (sign-in and sign-up toggle) + forgot password
  (tabs)/_layout.tsx
  (tabs)/index.tsx            Create
  (tabs)/designs.tsx          My Designs
  (tabs)/profile.tsx          Profile
  generating.tsx              loader / error / retry
  design/[id].tsx             before/after result
  api/auth/[...auth]+api.ts   Better Auth handler
  api/upload-auth+api.ts      GET ImageKit upload signature
  api/generate+api.ts         POST generate
  api/designs+api.ts          GET list + today's remaining quota
  api/designs/[id]+api.ts     GET one (signed URLs)
src/lib/
  auth.ts          server Better Auth instance (drizzle adapter, expo plugin, deleteUser hook)
  auth-client.ts   client (expoClient + expo-secure-store)
  db/schema.ts     Drizzle schema (Better Auth tables + designs)
  db/index.ts      Neon serverless driver + drizzle
  imagekit.ts      server ImageKit client + signed-URL helper
  catalog.ts       ROOM_TYPES, STYLES (id, name, preview image, prompt text), buildPrompt()
  api.ts           fetch wrapper that attaches the auth cookie
```

### Data model (Neon Postgres, Drizzle)
- **Better Auth tables:** `user`, `session`, `account`, `verification`. The Better Auth CLI generates these.
- **`designs` table:**
  - `id` uuid pk
  - `user_id` → `user.id`, **on delete cascade**
  - `room_type` text
  - `style` text
  - `original_path` text
  - `result_path` text
  - `created_at` timestamptz default now()
  - Index on `(user_id, created_at desc)`.
- Only successful generations create a row, so there's no status column.
- **Quota check:** `count(*) where user_id = $1 and created_at >= date_trunc('day', now() at time zone 'utc')`. No separate quota table.
- The database stores ImageKit **file paths**, never URLs. URLs are signed when a design is read.

### Architecture
```
Expo app ──(cookie session)──► Expo API routes on EAS Hosting ──► Neon Postgres (Drizzle)
   │                                    │  ├─► OpenAI images.edit
   └──direct multipart upload──► ImageKit ◄┘  └─► ImageKit (upload result, sign URLs)
```
- **Business logic lives only in API routes.** These cover quota, prompt building, input allowlists and path ownership. The app is a thin UI.
- **Upload:**
  1. The app calls `GET /api/upload-auth` and receives `{token, expire, signature, publicKey, folder: /users/{uid}/originals}`.
  2. The app POSTs FormData straight to ImageKit's upload endpoint using plain `fetch` (no client SDK) with `isPrivateFile=true`.
  - This keeps large uploads out of EAS Hosting.
- **Generate** (`POST /api/generate {originalPath, roomType, style}`):
  1. Require a session.
  2. Validate `roomType` and `style` against `catalog.ts`.
  3. Check that `originalPath` starts with `/users/{uid}/`.
  4. Check the quota. If it's used up, return 429 "Daily limit reached".
  5. Fetch the original through a signed URL.
  6. Call `openai.images.edit` with model `gpt-image-2.6-sunburst`, quality `medium`, output JPEG.
  7. Upload the base64 result to `/users/{uid}/results` (private).
  8. Insert a `designs` row.
  9. Return the design with signed URLs.
  - If OpenAI fails or refuses: return 502 with a friendly message, insert no row, use no quota.
- **Signed URLs:** valid for 1 hour, generated per request. The history grid uses an ImageKit resize transform (`w-400`) for thumbnails.
- **Auth details:**
  - Better Auth with `emailAndPassword`, `socialProviders: { google, apple }`, the `expo()` plugin, `trustedOrigins: ['<scheme>://']`, and `user.deleteUser.enabled`.
  - A `beforeDelete` hook removes the user's ImageKit folder. Database rows go away through the cascade.
  - Native Apple sign-in uses `expo-apple-authentication` and passes the idToken to `signIn.social`. Google uses Better Auth's browser OAuth flow (no extra native library).
- **State:** no state library. `useState` plus refetching on screen focus.
- **Styling:** NativeWind with one dark palette. Before/after slider built on `react-native-gesture-handler` and `reanimated` (already in the Expo template, so no new dependency).

### Versions (checked 2026-11-24)
| Package / service | Version or setting |
|---|---|
| Expo SDK | 58 (`expo` 58.0.x, `expo-router` 58.0.x) |
| `better-auth` + `@better-auth/expo` | 1.7.x |
| `@imagekit/nodejs` | 7.x |
| OpenAI model | `gpt-image-2.6-sunburst` (`gpt-image-1` is shut down) |

Confirm exact APIs with context7 or the docs during each phase.

### Environments & delivery
- **Neon:** `main` branch for production, `dev` branch for local work.
- **Development:** an EAS **development build** from day one. Expo Go can't do native Apple sign-in with your bundle ID. The API runs from the local dev server.
- **API hosting:** `eas deploy` for preview, `eas deploy --prod` for production. Production needs a **paid EAS plan**, because the free tier's 10 ms CPU limit is too low.
- **Store builds:** EAS Build plus EAS Submit.
- **Server env vars:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID/SECRET`, `APPLE_CLIENT_ID/TEAM_ID/KEY_ID/PRIVATE_KEY`, `OPENAI_API_KEY`, `IMAGEKIT_PUBLIC_KEY/PRIVATE_KEY/URL_ENDPOINT`, `RESEND_API_KEY`.

---

## 2. Assumptions (not firmly answered; change any)
1. **Forgot password** sends email through **Resend** (free tier). Email/password login for a store app isn't really shippable without it. There's no email verification at sign-up.
2. **Room types:** Living room, Bedroom, Kitchen, Bathroom, Dining room, Home office.
3. **Styles:** Modern, Minimalist, Scandinavian, Luxury, Industrial, Bohemian, Japandi, Coastal. Preview images are generated once with the same API and bundled in the app.
4. The daily quota resets at **00:00 UTC**, not the user's local midnight.
5. **Output size** follows the photo's orientation (1536×1024 or 1024×1536). The input is resized on the phone first to cut upload size and OpenAI input-token cost.
6. **Apple sign-in appears on iOS only.** Android shows email and Google.
7. The **welcome screen** is a single hero screen, not a multi-slide carousel.
8. The **privacy policy** is a simple hosted page (a static page or Notion). The store privacy labels must disclose that photos are sent to OpenAI.
9. **Testing:** a manual end-to-end checklist on one real iPhone and one real Android phone, plus one small assert script for `buildPrompt` and input/path validation. No test framework.

## 3. Open risks / unknowns
1. **EAS Hosting request length is undocumented.** It runs on Cloudflare Workers, where waiting on `fetch` shouldn't count as CPU time, but this hasn't been verified for EAS. A request waiting 30–120 s on OpenAI could fail. **This is spike #1 in Phase 1.** Fallback: move only `/api/generate` to a Neon Function.
2. **Better Auth bundled into EAS Hosting** (Workers runtime, CommonJS bundling) is unverified. **This is spike #2 in Phase 1.**
3. **Leaving the app mid-generation** (backgrounding, lost signal) can drop the request. The user isn't charged, but the OpenAI cost may already be spent. Upgrade path: a background job plus polling.
4. **Quota race:** two simultaneous requests can both pass the check, so one user can reach 6 in a day. Acceptable for v1. Fix later with a transaction or advisory lock.
5. **`gpt-image-2.6` pricing and size options aren't published per image.** About $0.04–0.06 per image is estimated from `gpt-image-2`. Check the real cost on the OpenAI dashboard after the first 20 generations.
6. **OpenAI moderation may refuse some photos** (for example, photos with people in them). Show a clear message, and don't count it against the quota.
7. **App Store review** for AI apps: account deletion, Sign in with Apple and privacy disclosures are covered. AI-generated content policies may still raise questions.
8. **Fixed costs:** Apple Developer ($99/yr), Google Play ($25 one-time) and the EAS paid plan.

---

## 4. Build steps (each phase ends demoable)
0. **Accounts & keys:** Neon project (main + dev branches), ImageKit, OpenAI, Resend, Expo/EAS, Apple Developer (bundle ID, Sign in with Apple key), Google Cloud OAuth client.
1. **Scaffold + spikes:**
   - `create-expo-app` (SDK 58), NativeWind, dark theme tokens, the three-tab skeleton, development build on both phones.
   - **Spike #1:** deploy a route that waits 120 s, then returns a ~2 MB base64 payload.
   - **Spike #2:** deploy the Better Auth handler to EAS Hosting.
   - Decide on the Neon Function fallback here if either spike fails.
2. **Database + auth:**
   - Drizzle schema plus generated Better Auth tables, then migrate to the dev branch.
   - Email sign-up/in, auth gate, session in SecureStore.
   - Then Google, Apple and forgot password (Resend).
3. **Photo upload:** `expo-image-picker` (camera + library) → `expo-image-manipulator` resize → `/api/upload-auth` → direct private upload to ImageKit.
4. **Generate:** `catalog.ts` with the prompt template, `/api/generate` with validation, quota, OpenAI, ImageKit upload and database insert, the Generating screen, and the Result screen with the before/after slider.
5. **History:** `/api/designs` list and detail with signed URLs, thumbnail grid, empty state.
6. **Profile:** remaining quota, sign out, delete account (cascade plus ImageKit folder cleanup), privacy policy link.
7. **Polish:** every error and empty state, an offline banner, app icon and splash, style preview images, haptics on Generate.
8. **Release:**
   - Migrate the Neon `main` branch, then `eas deploy --prod` with production env vars.
   - EAS Build (production), store listings and screenshots, privacy labels, EAS Submit.

## 5. Verification (definition of done)
Pass the manual checklist on a real iPhone and a real Android phone against **production**:
- Sign up and sign in with each provider. The session survives an app restart.
- Camera photo and gallery photo both generate a result within about 2 minutes, and the result keeps the room's layout.
- The before/after slider works.
- The result appears in My Designs after an app restart.
- The 6th generation of the day shows the limit message. A forced OpenAI failure (bad key on preview) shows Retry and doesn't use quota.
- An image URL stops loading after it expires (privacy check).
- Delete account removes the user's sign-in, their designs rows and their ImageKit folder.
- The validation assert script passes.
