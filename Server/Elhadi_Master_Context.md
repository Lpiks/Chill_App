# 🎬 Master Project Context — Elhadi's Dev Universe

> This file is the **single source of truth** for all ongoing projects.  
> Share it with any AI agent at the start of a conversation so it has full context.  
> Last updated: April 2026

---

## 👤 About the Developer

- **Name:** Abdelhadi Hammaz (goes by Elhadi)
- **Age:** 27
- **Location:** Algiers, Algeria 🇩🇿
- **Background:** Master 2 student in Process Engineering (Sustainable Development) at USTHB. PFE defense scheduled June 2026 at Sonatrach's Sidi Rzine refinery.
- **Skills:** Self-taught MERN Stack developer + React Native. Production-grade level.
- **Agency:** Co-founder of **Stepping Stones** — a web/app/SaaS and AI automation dev agency, alongside partner **Mohamed Slimani**. Domain: `steppingstones.cloud`
- **Goal:** Become a digital nomad. Relocate to Bali post-graduation for its entrepreneurial networking ecosystem before mandatory military service.
- **Style:** Prefers direct, honest feedback over diplomatic hedging. Plans thoroughly before building. Works iteratively. Uses AI agents to build, Claude as review/mentor layer.

---

## 🗂️ Active Projects Overview

| Project                 | Type                                 | Status         | Stack               |
| ----------------------- | ------------------------------------ | -------------- | ------------------- |
| StreamFlow              | Personal streaming platform (mom)    | In progress    | MERN + React        |
| Cinedz                  | Social streaming platform (product)  | Planning phase | MERN + React Native |
| SMAE                    | PFE thesis — environmental audit app | In progress    | MERN                |
| Stepping Stones website | Agency website                       | Live           | MERN + Vercel       |

---

## 🏠 PROJECT 1: StreamFlow (Mom's Streaming Platform)

### What it is

A personal, private, ad-free streaming platform built for Elhadi's mom to watch Korean dramas and movies without ads. Also used by Elhadi personally. Single household use — no auth system needed.

### Core Features

- Browse movies and series via TMDB metadata
- Ad-free streaming via custom HLS.js player (NO iframes)
- Arabic, French, English subtitle support (Subdl primary, OpenSubtitles fallback)
- Watchlist + continue watching (MongoDB)
- Watch Party: synced playback, live chat, camera call with mic/camera toggles (Socket.io + PeerJS)

### Tech Stack

| Layer            | Tech                                                 |
| ---------------- | ---------------------------------------------------- |
| Frontend         | React 18 + Vite + Tailwind CSS                       |
| Backend          | Node.js + Express.js                                 |
| Database         | MongoDB + Mongoose                                   |
| Video Player     | Custom VideoPlayer.jsx (HLS.js + native `<video>`)   |
| Metadata         | TMDB API                                             |
| Streaming        | Puppeteer extracts `.m3u8` from vidsrc.to            |
| Fallback sources | VidLink → MultiEmbed (all via Puppeteer extraction)  |
| Subtitles        | Subdl API (primary) + OpenSubtitles (fallback)       |
| Real-time        | Socket.io + PeerJS (WebRTC)                          |
| Deployment       | Vercel (frontend) + Render (backend) + MongoDB Atlas |

### Streaming Architecture

- **NO iframes anywhere** — this is a hard rule
- Puppeteer loads vidsrc/VidLink/MultiEmbed headlessly
- Intercepts network requests to capture the real `.m3u8` HLS URL
- Returns it to the frontend via `GET /api/stream`
- Frontend feeds it into the custom VideoPlayer component
- Provider fallback chain: VidSrc → VidLink → MultiEmbed
- If all fail: clean error message + retry button (never a blank screen)
- Stream URLs cached for 15 minutes max then re-extracted
- Puppeteer timeout: 30 seconds per provider
- Block images/CSS/ads/tracking/fonts in Puppeteer for speed
- Telegram bot alerts if a provider goes down

### Custom VideoPlayer.jsx (Web)

Built from scratch. Features:

- HLS.js for `.m3u8` playback via native `<video>` element
- Custom controls: play/pause, skip ±10s, volume, mute
- Progress bar: seekable, hover timestamp tooltip, draggable scrubber
- Time display: `current / total`
- CC button (red dot indicator when active) → subtitle language menu (AR/FR/EN/Off)
- Settings panel: playback speed (0.5x–2x), subtitle size (S/M/L), subtitle color (white/yellow), quality selector
- Fullscreen button (native mobile fullscreen API)
- Top bar with title (fades after 3s idle)
- Next/Previous episode buttons: appear at last 2 minutes, large center-screen, smooth fade-in
- Auto-hide controls after 3s idle, reappear on mouse/tap
- Keyboard shortcuts: Space, ArrowLeft/Right (±10s), ArrowUp/Down (volume), F (fullscreen), M (mute)
- Mobile: double-tap left/right for ±10s with YouTube-style flash indicator, lock controls button
- Subtitle rendering: native `<track>` element, .srt → .vtt conversion client-side
- Subtitle background: semi-transparent black at 60% opacity
- Quality switch: saves timestamp → swaps source → resumes from same position
- Error state with retry button
- Loading spinner during buffering and quality switches
- Watch Party props: `onPlay`, `onPause`, `onSeeked`, `syncAction` for Socket.io integration
- Subtitle background: 60% opacity black
- Lock Controls: mobile feature to prevent accidental touches

### Watch Party (StreamFlow)

- Dedicated Stream page in navbar
- Create room → share room ID with friend
- Join via room ID or link
- Synced playback (Socket.io): play/pause/seek events broadcast to all room members
- Live chat (Socket.io)
- Camera call (PeerJS/WebRTC): camera + mic toggles, end call button
- Room stored in MongoDB (auto-expire after 24h)
- Backend: Socket.io events: `join-room`, `play`, `pause`, `seek`, `chat-message`, `user-connected`, `user-disconnected`
- PeerJS server on port 9000

### Environment Variables

**Server `.env`:**

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
MONGODB_URI=your_mongodb_uri
OPENSUBTITLES_API_KEY=your_key
OPENSUBTITLES_USERNAME=your_username
OPENSUBTITLES_PASSWORD=your_password
SUBDL_API_KEY=your_subdl_key
```

**Client `.env`:**

```env
VITE_TMDB_API_KEY=your_tmdb_key
VITE_API_BASE_URL=http://localhost:5000/api
VITE_WATCHLIST_PIN=1234
```

### Key Rules

- No iframe anywhere in the codebase — ever
- No auth system — single household app
- Puppeteer must close browser instances in `finally` blocks
- Cache stream URLs 15 min max
- Subdl is primary subtitle source, OpenSubtitles is fallback
- Subtitle fallback chain: Arabic → French → English

---

## 🎬 PROJECT 2: Cinedz (Social Streaming Platform)

### What it is

Algeria's first social streaming platform. Combines Netflix-style streaming + Letterboxd social feed + WhatsApp-style DMs — built specifically for the Algerian market in DZD.

**One-line pitch:** Letterboxd + Netflix + WhatsApp — Made for Algeria 🇩🇿

### Market Opportunity

- Zero real competition in Algeria for this product
- Chacha TV only covers local Algerian content, no social features
- 45 million Algerians — 10,000 users = 0.02% of the market
- Most Algerians consume content on mobile
- Netflix requires Paysera/PayPal — Algerians can't pay easily
- Cinedz accepts Edahabia + CIB natively in DZD

### Core Features

#### 1. Authentication

- Email + password
- Phone number (+213) with OTP SMS verification (Twilio)
- JWT tokens
- Biometric auth on mobile (FaceID / TouchID via expo-local-authentication)

#### 2. Social Feed

- Rate movies/series with stars
- Like and react to posts
- Comment on posts
- Algorithm-based feed (like Instagram) — sorted by engagement + user behavior + recency
- Feed score formula: `(genre_match × 0.4) + (algeria_trending × 0.3) + (rating × 0.2) + (recency × 0.1)`

#### 3. Algerian Trending Chart 🇩🇿

- Built from: most rated this week + most reposted/shared + most watched (stream count)
- Displayed by category: Movies / Series / K-Drama / Anime
- Updated weekly
- Unique real Algerian taste data — nobody else has this

#### 4. Direct Messages

- Text messages
- Share a movie/series card
- Voice messages (stored on Cloudinary)
- Seen/delivered status
- One-on-one + group chats
- Real-time via Socket.io
- Free tier = limited DMs, Premium = unlimited
- DMs only between friends (no strangers)

#### 5. Ad-Free Streaming

- Torrentio + Real-Debrid for clean `.m3u8` streams (no Puppeteer needed — API gives URL directly)
- Custom player on mobile: react-native-video as engine + custom UI overlay (same design as web player)
- Subtitles: Arabic, French, English (Subdl primary, OpenSubtitles fallback)
- Subtitle fallback: AR → FR → EN
- Audio track switcher (original / Arabic dub / French dub when available)
- Quality locked by tier: Free=SD, Basic=720p, Standard=1080p, Premium=4K
- Stream count tracked for Algerian trending algorithm
- 4-source fallback: Torrentio+RD → Torrentio free → vidsrc → 2embed
- Telegram bot monitoring alerts when sources go down

#### 6. Watch Party

- Dedicated Watch Party page
- Host searches/picks content → generates room ID
- Invite via room ID or add friends directly from friends list
- Max 5 people per room (Premium feature)
- Synced video playback (Socket.io)
- Live chat during movie
- Camera call (PeerJS/WebRTC) with mic + camera toggles
- Emoji reactions during scenes
- Start from: movie/series detail page OR from DMs (invite friend directly)

#### 7. Friend System

- Search users by name
- Send/accept/decline friend requests
- Friends list
- DMs only between friends
- Invite friends to Watch Party directly from friends list

#### 8. User Onboarding

5-screen flow, under 3 minutes from signup to first stream:

1. Welcome — logo + tagline in Darija, Sign Up / Login
2. Sign Up — name, email or phone, OTP verification
3. Pick your vibe — content categories (multi-select)
4. Language preferences — subtitle + UI language (Arabic RTL / French)
5. 7-day free Premium trial activation (no card needed) → Home feed

#### 9. Recommendation Algorithm

Signals collected silently:

- Watched 80%+ → strong positive
- 5-star rating → strong positive
- Added to watchlist → positive
- Liked post → positive
- Watched 10% then stopped → negative
- Skipped suggestion → weak negative
- Ignored genre repeatedly → strong negative

User taste profile stored in MongoDB:

```js
{
  userId, genres: { action: 0.8, kdrama: 0.95, ... },
  languages, favoriteActors, averageWatchTime, updatedAt
}
```

#### 10. Content Moderation

- 🚩 Report button on every comment, post, profile, chat message
- Report categories: Spam / Harassment / Inappropriate / Fake / Other
- Auto-hide at 3-5 reports, suspend at 5+
- Bad words filter: Arabic + French + Darija
- Rate limiting: max 10 comments/messages per minute
- Admin dashboard for manual review

### Subscription & Pricing

| Tier     | Monthly DZD | Yearly DZD | Features                           |
| -------- | ----------- | ---------- | ---------------------------------- |
| Free     | 0           | —          | Browse, feed, limited DMs          |
| Basic    | 500         | 4,800      | SD streaming, no ads               |
| Standard | 900         | 8,600      | 1080p, unlimited DMs               |
| Premium  | 1,500       | 14,000     | 4K, Watch Party, no ads everywhere |

- 7-day free Premium trial on signup (no card needed)
- Payment: Edahabia (BaridiMob) + CIB / Slick Pay
- Both monthly + yearly options
- No refunds after 24h — clear ToS in Arabic + French
- Real-Debrid cost absorbed by Elhadi (not user-facing)

**Netflix vs Cinedz (square rate 1 USD ≈ 237 DZD):**

- Netflix Basic: ~946 DZD real cost vs Cinedz Basic: 500 DZD (47% cheaper)
- Netflix Standard: ~1,894 DZD vs Cinedz Standard: 900 DZD (52% cheaper)
- Netflix Premium: ~2,368 DZD vs Cinedz Premium: 1,500 DZD (37% cheaper)

### Tech Stack

| Layer         | Technology                     | Purpose                              |
| ------------- | ------------------------------ | ------------------------------------ |
| Mobile        | React Native + Expo            | iOS & Android                        |
| Web           | React Native Web               | Same codebase, browser + SEO         |
| Styling       | NativeWind                     | Tailwind for React Native            |
| Animations    | React Native Reanimated        | Shared element transitions           |
| Backend       | Node.js + Express.js           | API server                           |
| Database      | MongoDB Atlas                  | All app data                         |
| Media         | Cloudinary                     | Profile pics + voice messages        |
| Real-time     | Socket.io                      | DMs, Watch Party sync, notifications |
| Video Calls   | PeerJS (react-native-webrtc)   | Watch Party camera calls             |
| Video Player  | react-native-video + custom UI | Ad-free native streaming             |
| Stream Source | Torrentio + Real-Debrid        | Content delivery                     |
| Subtitles     | Subdl API + OpenSubtitles      | AR/FR/EN subtitles                   |
| Metadata      | TMDB API                       | Movie/series info, posters, trailers |
| Auth SMS      | Twilio                         | OTP phone verification               |
| Biometric     | expo-local-authentication      | FaceID/TouchID                       |
| Haptics       | expo-haptics                   | Tactile feedback                     |
| Blur effects  | expo-blur                      | Glassmorphism UI                     |
| Poster colors | react-native-image-colors      | Dynamic gradient backgrounds         |
| Deployment    | Vercel + Render                | Frontend + Backend                   |

### Mobile Player Architecture

- Engine: `react-native-video` (ExoPlayer on Android, AVPlayer on iOS)
- Custom UI overlay: same design language as web VideoPlayer.jsx
- Native HLS `.m3u8` support — no HLS.js needed on mobile
- Subtitle tracks: passed via `textTracks` prop to react-native-video
- Picture-in-Picture (PIP) support for Watch Party chat
- Same controls: CC, Settings, fullscreen, next/prev episode, skip ±10s
- Haptic feedback on play, like, room sync

### UI/UX Design System

**Colors:**

- Background: `#0a0a0f` (deep dark)
- Accent: `#e50914` (electric red)
- Gold: `#f5c518` (ratings)
- Text: white primary, gray secondary

**Typography:**

- Display: Bebas Neue (titles, hero)
- Body: Nunito (readable, clean)
- Arabic: Cairo (Google Fonts — excellent Arabic support)

**Design principles:**

- Dark mode only
- Glassmorphism (expo-blur) on overlays and nav bars
- Dynamic color gradients extracted from movie posters
- Shared element transitions (poster tap → detail page)
- Haptic feedback on key interactions
- Full Arabic RTL support
- Large touch targets (min 44px) — mom-friendly

### MongoDB Collections

| Collection    | Key Data                                        |
| ------------- | ----------------------------------------------- |
| Users         | Profile, auth, subscription tier, taste profile |
| Posts         | Feed posts, reposts, ratings, likes, comments   |
| Messages      | DMs, group chats, voice message refs            |
| Friendships   | Friend requests, accepted friends               |
| Watchlist     | Saved movies/series per user                    |
| Progress      | Continue watching + timestamp                   |
| Rooms         | Watch party rooms (auto-expire 24h)             |
| Reports       | Moderation reports                              |
| Notifications | All user notifications                          |
| Trending      | Cached weekly Algeria trending scores           |

### Infrastructure Costs & Profitability

**Monthly costs by scale:**
| Scale | Total USD | Total DZD |
|---|---|---|
| 0–100 users | ~$39 | ~9,243 DZD |
| 100–500 users | ~$100 | ~23,700 DZD |
| 500–1,000 users | ~$232 | ~54,984 DZD |
| 1,000–10,000 users | ~$640 | ~151,680 DZD |

**Break-even (paying users needed):**
| Scale | % needed | Your conversion |
|---|---|---|
| 100 users | 10% | 15–25% ✅ |
| 500 users | 5% | 15–25% ✅ |
| 1,000 users | 5.7% | 15–25% ✅ |
| 10,000 users | 1.57% | 15–25% ✅ |

**Profit projections:**
| Scale | Profit DZD | Profit USD |
|---|---|---|
| 100 users | ~27,957 DZD | ~$118/mo |
| 500 users | ~121,300 DZD | ~$512/mo |
| 1,000 users | ~235,016 DZD | ~$991/mo |
| 10,000 users | ~2,748,320 DZD | ~$11,596/mo |

### Go-To-Market Strategy

1. Personal network (0→20 users)
2. Algerian Facebook groups around movies/series/K-Drama (20→50 users)
3. TikTok + Instagram Reels in Darija — "J'ai créé le Netflix Algérien" (50→100 users)
4. r/algeria + Twitter/X — founder story is compelling and shareable

### Launch Timeline

| Period             | Focus                                                 |
| ------------------ | ----------------------------------------------------- |
| Now → April 2026   | Stepping Stones sprint + StreamFlow for mom           |
| April → June 2026  | PFE defense prep + graduation                         |
| July → August 2026 | Move toward Bali + start Cinedz MVP (one feature/day) |
| September 2026+    | Quiet beta launch in Algeria                          |
| End of 2026        | First 100 paying users, iterate                       |

### Key Decisions & Rules

- **No iframe anywhere** — custom player only
- **No Netflix-style family accounts** at launch — 1 account = 1 person (family plan later)
- **Real-Debrid paid by Elhadi** — users don't pay it separately
- **Web + mobile from same codebase** — React Native Web for SEO + mobile for users
- **Legal grey zone** — Torrentio/Real-Debrid model (Stremio approach), no content hosted by Cinedz
- **Build order:** one feature a day, no rush, steady progress
- **Content source:** Torrentio + Real-Debrid API (no Puppeteer needed unlike StreamFlow)

---

## ⚙️ Shared Technical Decisions

### Subtitle System (Both Projects)

- **Primary:** Subdl API — free, generous limits
- **Fallback:** OpenSubtitles API (100 downloads/day free tier)
- **Fallback chain:** Arabic → French → English
- **Caching:** Store downloaded .srt files in MongoDB to avoid re-fetching
- **Conversion:** .srt → .vtt client-side via:

```js
function srtToVtt(srt) {
  return "WEBVTT\n\n" + srt.replace(/(\d+:\d+:\d+),(\d+)/g, "$1.$2").trim();
}
```

### API Keys Needed

| Service          | Used In | Where to Get                   |
| ---------------- | ------- | ------------------------------ |
| TMDB API         | Both    | themoviedb.org/settings/api    |
| Subdl API        | Both    | subdl.com/setting/developer    |
| OpenSubtitles    | Both    | opensubtitles.com/en/consumers |
| Twilio (SMS OTP) | Cinedz  | twilio.com                     |
| Real-Debrid      | Cinedz  | real-debrid.com                |
| Cloudinary       | Cinedz  | cloudinary.com                 |

### Deployment Stack

| Service       | Purpose             | Cost                       |
| ------------- | ------------------- | -------------------------- |
| Vercel        | Frontend hosting    | Free                       |
| Render        | Backend + Puppeteer | $25/mo                     |
| MongoDB Atlas | Database            | Free → paid as scale grows |
| Cloudinary    | Media storage       | Free tier                  |

---

## 🏗️ Stepping Stones Agency Context

- Co-founders: Elhadi (Growth/Ops/Client) + Mohamed Slimani (Tech/Content)
- Domain: `steppingstones.cloud` (Vercel frontend / Render backend / Hostinger DNS)
- Current sprint: 30-day client acquisition goal (1–2 clients)
- Active client: B2B online ordering platform (packaging/printing warehouse) — 250,000 DZD, 30% upfront / 70% delivery
- Second project from same client pending: atelier management SaaS

---

## 📌 Important Notes for Any AI Agent

1. **Elhadi prefers direct honest feedback** — no sugarcoating
2. **Always give prompts, not implementations** — Elhadi uses AI agents to build, Claude/you as mentor layer
3. **StreamFlow = private personal use** — no auth, no public deployment concerns
4. **Cinedz = real product** — treat it seriously, business decisions matter
5. **Algeria context matters** — square rate (~237 DZD/USD), Edahabia/CIB payments, Darija language, Algerian market dynamics
6. **Build order for Cinedz:** Auth → Friends → Feed → Trending → DMs → Streaming → Subscriptions → Watch Party
7. **No iframes ever** in either project — this is non-negotiable
8. **React Native video player = react-native-video engine + custom UI overlay** (not HLS.js on mobile)
9. **Web player = custom VideoPlayer.jsx** with HLS.js + native `<video>` element (no Plyr, no iframe)
10. **Cinedz is not StreamFlow** — bigger scope, different content source (Torrentio vs Puppeteer), auth system, social features

---

_End of master context document. Share this file at the start of any AI conversation to get full project context instantly._
