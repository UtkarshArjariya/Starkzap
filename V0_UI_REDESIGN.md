# Dare Board — UI/UX Redesign Brief for v0

> **Project:** Dare Board (dareboard.vercel.app) — A Starknet-based social challenge platform where users post dares with crypto bounties, community votes on proof, and the smart contract distributes rewards.
>
> **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, lucide-react icons, Space Grotesk (sans) + IBM Plex Mono (mono) fonts.
>
> **Goal:** Redesign all pages and components to look and feel like a world-class product — think Polymarket meets Product Hunt meets Uniswap. Clean, bold, trustworthy, addictive. Every screen should feel like it belongs to a $100M+ product.

---

## Design System Requirements

### Color Palette (Dark Mode — Primary)
- **Background:** Deep navy-black `hsl(222, 48%, 6%)` with subtle radial gradients (cyan top-left, fuchsia top-right) for depth
- **Surface cards:** `bg-white/[0.04]` glass panels with `border-white/10` + `backdrop-blur-xl`
- **Primary CTA:** Vibrant cyan `#67e8f9` on dark `#0f172a` text — bold, unmissable
- **Accent colors:** Fuchsia for rewards/highlights, Emerald for success/approve, Rose for error/reject, Amber for warnings, Violet for social login
- **Text hierarchy:** White (headings) → slate-200 (body) → slate-400 (secondary) → slate-500 (labels/muted)

### Typography
- **Font:** Space Grotesk (400/500/600) for all text, IBM Plex Mono for addresses/numbers
- **Labels:** `text-[11px] uppercase tracking-[0.22em] text-slate-500` — used extensively for section labels
- **Headings:** Bold, tight tracking, large sizes (2xl–4xl on detail pages)

### Component Patterns
- **Border radius:** `rounded-full` for pills/badges, `rounded-2xl` for inputs/buttons, `rounded-[1.75rem]` for card panels
- **Glass surfaces:** `.surface-panel` = `rounded-[1.75rem] border border-white/10 bg-white/[0.04]`
- **Hover effects:** Cards lift with `-translate-y-0.5` + cyan border glow + `shadow-glow`
- **Animations:** Smooth 200ms transitions, slide-in toasts, pulse on live elements (voting dot)

### Light Mode
- Full CSS variable swap — light blue-grey background, white cards, darker text. Must be equally polished.

---

## Current Pages & What Needs Improvement

---

### 1. FEED PAGE (`/`) — The Homepage

**Current state:**
- Hero section with gradient mesh background, app title, inline stat chips (dare count, total staked), two CTAs
- "Dare of the Day" spotlight card below hero
- Status filter pills (All/Open/Claimed/Voting/Approved/Rejected/Expired) — horizontal scroll mobile
- Category filter chips (fitness, food, social media, etc.)
- 2-column grid of DareCards
- "Load more" button at bottom

**Problems:**
1. **Hero is generic and wordy** — doesn't immediately communicate what the app does or create urgency. No social proof, no live activity feed, no trending dares.
2. **No visual hierarchy between Open dares (actionable) and finished dares** — everything looks the same in the grid. Open dares should scream "claim me now" while expired/approved should feel settled.
3. **Filter pills look plain** — no count badges, no active state animation, bland styling.
4. **No search** — users can't find specific dares by title or poster.
5. **"Dare of the Day" is disconnected** — it's just a card that blends in. Should be a premium, unmissable spotlight section with its own visual treatment.
6. **No onboarding** — new visitors don't understand the flow (Post → Claim → Prove → Vote → Win). There should be a subtle "How it works" section or animated flow.
7. **Empty state is weak** — when no dares match a filter, the empty state is a plain text card.
8. **No real-time activity ticker** — no sense of liveness. Polymarket shows recent bets. We should show "X just claimed dare Y" or "Z just posted a 50 STRK dare" in a scrolling banner.
9. **Mobile: hero takes too much space** — should collapse to a compact banner on mobile.
10. **Stats in hero are raw numbers** — should be animated counters or have more visual weight.

**Redesign direction:**
- **Compact, punchy hero** with animated tagline, live stat counters (total dares, total staked, total paid out), and a single bold CTA "Post a Dare". Secondary CTA becomes a text link.
- **Live activity ticker** below hero — horizontal scroll of recent events ("🔥 0xAb3f just posted 'Run 10km' for 25 STRK", "⚡ 0x7c2a claimed 'Eat a ghost pepper'").
- **"Dare of the Day" gets a premium treatment** — full-width card with glow border, larger text, countdown, and featured badge. Think Twitter's "What's happening" spotlight.
- **Tabbed filters with counts** — each filter shows the count as a badge. Active tab has a sliding underline animation (like Vercel dashboard tabs).
- **DareCard redesign** — Open dares get a subtle emerald left-border or glow. Voting dares pulse. Finished dares are slightly muted. Reward amount should be the most prominent element.
- **Search bar** — simple input at the top of the grid, searches title/description.
- **"How it works" collapsible** — 4-step horizontal flow (Post → Claim → Prove → Vote) with icons, shown on first visit or when feed is empty.
- **Skeleton loading** should perfectly match the card layout (current is good, keep it).

---

### 2. DARE CARD COMPONENT — The Core Unit

**Current state:**
- Rounded card with reward pill, legacy badge, title, description (2-line clamp), tags, 2-column info panel (poster + deadline), voting bar (when voting), action label + copy link icon.

**Problems:**
1. **Reward amount doesn't pop enough** — it's in a small fuchsia pill that looks like a tag. The reward is THE most important info; it should dominate visually.
2. **Too much vertical space** — the inner info panel (poster + deadline) with its own border creates unnecessary nesting. Cards should be more compact.
3. **No visual urgency indicators** — dares expiring in <6h should have a red pulsing indicator. High-reward dares (>10 STRK) should have a special treatment.
4. **Voting progress bar is too subtle** — when a dare is in Voting, the bar should be prominent and animated.
5. **Legacy banner is too prominent** — takes up card space for information most users don't care about. A small badge is enough.
6. **Copy link button is too small** — hard to tap on mobile.
7. **No hover preview** — on desktop, hovering a card could show a brief peek at the description without clicking.

**Redesign direction:**
- **Reward as hero element** — large bold number (e.g., "25 STRK") at the top-right or as a prominent badge, with the token icon.
- **Compact layout** — poster address and deadline in a single row below the title, not in a separate bordered panel.
- **Urgency badge** — if deadline is <6h away, show a red "⏰ Ending soon" badge that pulses.
- **High-value badge** — dares with reward >10 STRK get a "🔥 High Reward" badge.
- **Voting bar redesign** — when in Voting status, the card gets a special treatment with the vote bar prominently displayed and the current vote split.
- **Mobile optimization** — ensure the card is fully tappable and key info (title, reward, status) is visible at a glance.

---

### 3. CREATE DARE PAGE (`/create`)

**Current state:**
- Back link, template cards row (horizontal scroll mobile, grid desktop), 2-column form + lifecycle preview.
- Form: title input, description textarea, token select + amount, deadline datetime-local, category tags, error banner, submit button.
- Right side: numbered lifecycle steps + live preview card.

**Problems:**
1. **Template cards are tiny and hard to read** — the emoji + title in a 128px card is cramped. Should be bigger with better descriptions.
2. **Form feels like a generic admin form** — no personality, no guidance, no progressive disclosure.
3. **Token select + amount are disconnected** — should feel like a unified "reward picker" with the token icon visible.
4. **Deadline picker is raw `datetime-local`** — ugly native input. Should have quick-select buttons ("24h", "3 days", "1 week") plus a nice date picker.
5. **Category selection has no visual flair** — just plain chips.
6. **No preview of what the dare will look like** — the lifecycle diagram is useful but the actual card preview would be more compelling.
7. **Fee notice is too subtle** — "1% platform fee" buried as small text. Should be a clear breakdown: "You stake: 25 STRK → Poster fee (1%): 0.25 STRK → Escrowed: 24.75 STRK → If approved, claimer receives: 24.50 STRK".
8. **Submit button doesn't show cost** — should say "Post Dare (25 STRK)" not just "Post dare".
9. **No character count for description** is misleading — there is one but it's easy to miss.
10. **Mobile: 2-column layout breaks** — lifecycle preview should move below the form or become a collapsible section.

**Redesign direction:**
- **Step-based form** (optional) — split into steps: 1) Choose template or start blank, 2) Title + Description, 3) Reward + Deadline, 4) Review & Post. Each step has clear validation.
- **Or single-page but with better grouping** — grouped sections with clear headings and icons.
- **Token picker with icon** — show the STRK/ETH icon next to the dropdown. Amount field shows USD estimate if possible.
- **Quick deadline buttons** — "24 hours", "3 days", "1 week", "Custom" pills above the datetime input.
- **Fee breakdown card** — when amount is entered, show a mini receipt: Stake → Fee → Escrowed → Winner receives.
- **Live card preview** — on the right (desktop) or bottom (mobile), show exactly how the dare will appear in the feed.
- **Bold CTA** — "Post Dare for 25 STRK" with the amount dynamic.

---

### 4. DARE DETAIL PAGE (`/dare/[id]`)

**Current state:**
- 2-column layout: left has reward pill, title (large), description, tags, share button, status badge, metric cards (poster, deadline, votes, claimer), action buttons; right has lifecycle list + vote panel.
- ProofModal as overlay for submitting proof.
- Confetti on Approved status.
- Legacy banner, expiry warnings.

**Problems:**
1. **Too much information density** — the metric cards (poster, deadline, votes, claimer, voting end) are all the same size and priority. Poster and claimer should be de-emphasized; voting info should be prominent when in Voting state.
2. **Action buttons don't match their importance** — Claim (the most important action on an Open dare) is just one of several buttons. It should be THE hero CTA.
3. **Vote panel on the right feels disconnected** — on mobile it's pushed way down. Voting should be the #1 thing you see on a Voting dare.
4. **No proof preview on detail page** — when proof is submitted, it should be front and center, not buried in the vote panel.
5. **Timeline/history is missing** — there's no visual timeline showing when the dare was posted, claimed, proof submitted, voting started, finalized.
6. **Share button is underwhelming** — should be more prominent with social sharing options.
7. **Mobile layout** — single column works but the lifecycle sidebar is redundant on mobile.
8. **Confetti is fun but brief** — the Approved state should have a more permanent celebration (winner card, payout animation).

**Redesign direction:**
- **Adaptive layout based on status:**
  - **Open:** Hero section with title + reward + deadline countdown. Big "Claim This Dare" CTA. Description below. Poster info subtle.
  - **Claimed:** Show claimer info + "Waiting for proof" status. Claimer sees "Submit Proof" CTA.
  - **Voting:** Proof is hero content (video/image embed). Vote bar is large and centered. Vote buttons are prominent. Timer shows voting deadline.
  - **Approved:** Winner celebration card with payout amount, winner address, confetti. Proof replay available.
  - **Rejected/Expired:** Muted styling, refund info.
- **Activity timeline** — vertical timeline on the right (desktop) showing key events with timestamps.
- **Better proof display** — when proof is submitted, show it as a featured embed (YouTube/image) above the vote panel.
- **Prominent share** — after claiming or voting, prompt "Share this dare" with pre-filled tweet text.

---

### 5. PROFILE PAGE (`/profile`)

**Current state:**
- Disconnected: centered card with Connect button.
- Connected: avatar circle, address + copy button, wallet type label, Privy funding notice, 2 stat cards (posted/claimed), tab row (posted/claimed/activity), dare grid or activity timeline.

**Problems:**
1. **Avatar is a generic icon** — should generate a unique avatar from the address (like Ethereum's identicons or jazzicons).
2. **Stats are just two numbers** — no visual impact. Should show total earned, total staked, win rate, etc.
3. **Activity timeline is basic** — just a list of text events with emojis. Should have proper event cards with links, amounts, and relative timestamps.
4. **No reputation/badges system shown** — even just displaying "5 dares completed" or "First dare!" badges would add engagement.
5. **"My dares" grid doesn't show quick actions** — if a dare needs finalizing, the user should see that prominently.
6. **Privy funding notice looks like an error** — should be a friendly info card with a "Fund wallet" CTA that shows the address to send to.

**Redesign direction:**
- **Profile header redesign:**
  - Generated avatar (gradient-based or identicon from address)
  - Large address with .stark name resolution
  - Stats row: Dares Posted | Dares Won | Total Earned | Win Rate
  - Wallet type badge (elegant, not jarring)
- **Activity feed redesign:**
  - Proper event cards with icons, amounts, timestamps, and links to the dares
  - Group events by day with date headers
- **Quick actions** — if any of the user's dares need attention (proof pending, voting ended, can finalize), show a "Needs Attention" section at the top.
- **Privy wallet card** — if Privy wallet, show a friendly "Fund your wallet" section with QR code and address to copy.

---

### 6. LEADERBOARD PAGE (`/leaderboard`)

**Current state:**
- Three tabs: Top Earners, Top Posters, Most Voted. Each shows a table with rank, address, stats.

**Problems:**
1. **Looks like a plain data table** — no visual excitement. Leaderboards should feel competitive and engaging.
2. **No user's own rank highlighted** — if connected, show "You are #7" at the top.
3. **Top 3 should get special treatment** — gold/silver/bronze podium, larger cards, more detail.
4. **No time period filter** — should have "All time / This week / This month" filters.

**Redesign direction:**
- **Podium for top 3** — featured cards with medal icons, large addresses, prominent stats, gradient borders (gold/silver/bronze).
- **Connected user highlight** — "Your rank: #7" pinned card at the top with your stats.
- **Better table rows** — alternating subtle backgrounds, hover effects, rank numbers with medal icons for 1-3.
- **Period selector** — week/month/all-time toggle.

---

### 7. ADMIN PAGE (`/admin`)

**Current state:**
- Access-gated by wallet address. Filter tabs (All/Listed/Delisted), dare rows with status badges, delist/relist buttons. Legacy section at bottom.

**Problems:**
1. **Looks like a basic list** — no admin dashboard feel. Should have stats at the top (total dares, delisted count, treasury balance, fees collected).
2. **No search/filter by poster** — hard to find specific dares.
3. **No bulk actions** — can only delist one at a time.
4. **No confirmation dialog** — clicking Delist should prompt "Are you sure?".

**Redesign direction:**
- **Admin dashboard header** with key metrics: Total Dares, Active Dares, Delisted, Treasury Balance, Fees Collected.
- **Search bar** to filter by title or poster address.
- **Better table layout** with sortable columns.
- **Confirmation modal** for delist/relist actions.

---

### 8. WALLET MODAL — The Onboarding Moment

**Current state:**
- Bottom sheet (mobile) / centered modal (desktop). Three sections: Quick Login (Privy), Browser Extension (Argent X/Braavos), Social Login (Cartridge).

**Problems:**
1. **Three sections with different styles** — feels disjointed. Should feel like one unified "Choose how to connect" flow.
2. **Privy section is the most complex** — email input + sign-in is multiple steps. Should be the simplest (just click "Continue with Email").
3. **Extension wallets show install links for non-installed** — clutters the UI. Just show installed wallets, with a "Don't have a wallet? Get one" link at the bottom.
4. **No "recommended" indicator** — new users don't know which option to pick.

**Redesign direction:**
- **Single unified list** — each option is a row: Icon + Name + Description + Arrow. No section dividers.
- **Recommended badge** on the easiest option (Privy email).
- **Progressive disclosure** — show the 3 most common options first (Email, Argent X, Braavos). "More options" expands to show Cartridge, Google, Apple.
- **No install links inline** — if wallet not detected, just grey it out with "Not installed" text and a small "Get it" link.

---

### 9. HEADER / NAVIGATION

**Current state:**
- Sticky header with gradient logo, nav links (Feed/Create/Leaderboard/Profile), theme toggle, wallet connection pill.

**Problems:**
1. **Logo is over-engineered** — gradient circle + Zap icon + two text lines + network badge. Too busy. Should be a clean wordmark or simple icon + name.
2. **Nav links don't show active state clearly** — subtle bg change isn't enough. Should have a visible underline or indicator.
3. **Mobile hamburger menu is basic** — full-width links with no visual hierarchy.
4. **Theme toggle is disconnected** — tucked next to the wallet button. Could be in the mobile menu or settings.
5. **No notification indicator** — if a user's dare got claimed or voting ended, there's no visual prompt to check.

**Redesign direction:**
- **Cleaner header:** Simple logo icon + "Dare Board" text (no gradient blob). Clean nav with active underline. Wallet button with address.
- **Mobile:** Bottom tab bar instead of hamburger menu (Feed / Create / Profile) — much more mobile-native.
- **Notification dot** on Profile icon when there's activity on user's dares.

---

### 10. TOAST NOTIFICATIONS

**Current state:**
- Fixed bottom-right, max 3, auto-dismiss 5s. Success/error/info/warning types with colored left border, icon, message, optional tx hash link.

**This is actually well done.** Minor improvements:
- Add a subtle progress bar showing the auto-dismiss countdown.
- On mobile, toasts should be full-width at the bottom (not 320px fixed).
- Success toasts with tx hash should have a more prominent "View on Explorer" button.

---

## Global UX Improvements Needed

1. **Loading states everywhere** — any button that triggers a transaction should show inline loading (spinner + "Confirming..." text). Never leave the user wondering if something worked.
2. **Optimistic updates** — after voting, immediately update the vote bar before tx confirms. Show a "Confirming..." label.
3. **Error recovery** — all error states should have a retry button or clear next step. Never show a raw error.
4. **Mobile-first** — test every screen at 375px. Bottom sheet modals, larger tap targets (44px min), swipeable cards.
5. **Micro-animations** — card hover lifts, button press scales, number count-ups, status transitions. These create the "polished" feeling.
6. **Empty states** — every list/grid needs a beautiful empty state with illustration, message, and CTA. Not just text.
7. **Keyboard navigation** — focus rings, escape to close modals, enter to submit.
8. **Progressive disclosure** — don't show everything at once. Use expandable sections, tabs, and "Show more" patterns.
9. **Social proof** — show recent activity, total users, and community stats prominently.
10. **Consistent spacing** — use an 8px grid system. Current spacing is inconsistent (mt-4, mt-6, mt-8 mixed without clear logic).

---

## Pages to Generate

When generating components in v0, use these exact page names:

1. **`FeedPage`** — Homepage with hero, live ticker, dare grid, filters, search
2. **`DareCard`** — The card component used in feed and profile grids
3. **`CreateDarePage`** — The dare creation form with templates, preview, fee breakdown
4. **`DareDetailPage`** — Adaptive detail page (layout changes by dare status)
5. **`ProfilePage`** — User profile with stats, activity feed, quick actions
6. **`LeaderboardPage`** — Competitive leaderboard with podium and rankings
7. **`AdminPage`** — Admin dashboard with metrics, search, dare management
8. **`WalletModal`** — Unified wallet connection modal
9. **`Header`** — Responsive header with nav, wallet, notifications
10. **`VotePanel`** — Voting interface with proof display and vote buttons

---

## Tech Constraints

- **Tailwind CSS v4** — use utility classes, no external CSS-in-JS
- **lucide-react** for all icons
- **Space Grotesk** for sans, **IBM Plex Mono** for mono
- **Dark mode is default**, light mode via `html.light` class
- No external component libraries (no shadcn, no Radix, no HeadlessUI) — all custom
- All components must be React client components (`"use client"`)
- Starknet addresses are 66-char hex strings — always truncate with `0xAbCd...1234` pattern
- Token amounts are displayed with 2 decimal places (or 6 for tiny amounts)
- The app has 3 wallet types: Extension (Argent X/Braavos), Cartridge (social login), Privy (email/social)
