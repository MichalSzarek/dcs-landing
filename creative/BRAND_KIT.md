# Briefcaster Brand Kit (dcs-landing surface)
> Generated 2026-07-21 by creative-director / creative-studio-setup. Values read verbatim from
> `dcs-landing/briefcaster.html` (`<style>` block + Tailwind classes). The mobile app's
> `apps/mobile/theme/tokens.cjs` is the upstream source of truth; this file is the landing surface
> snapshot — regenerate when tokens change.

## Product one-liner
Briefcaster turns your news topics, RSS feeds, and YouTube channels into short, personalized audio
briefings — AI-scripted, narrated with natural voices.
Source: `briefcaster.html` hero copy (lines 156–165)

## Target & tone
- Persona: busy people who want to *listen* to a personalized daily brief instead of scrolling feeds.
- Voice: calm, precise, modern, confident — never hypey, never "growth-hack" loud.
- Languages: EN primary on this page; PL mirror at `/briefcaster/pl`.
Source: derived from landing copy — confirm with operator.

## Palette
| Token | Hex | Usage |
|---|---|---|
| canvas | #030712 | page background (`bg-gray-950`) |
| surface | #111827 | cards, inputs, badges (`bg-gray-900`) |
| brand (CTA) | #3b82f6 | primary accent, buttons, links (`blue-500`) |
| grad-1 emerald | #10b981 | gradient start, logo mark (`emerald-500`) |
| grad-2 blue | #3b82f6 | gradient mid (`blue-500`) |
| grad-3 violet | #8b5cf6 | gradient end (`violet-500`) |
| ink | #ffffff | primary text |
| inkMuted | #9ca3af | secondary text (`gray-400`) |
| inkFaint | #4b5563 | tertiary / fine print (`gray-600`) |
| hairline | rgba(59,130,246,0.04) | 64px grid lines, borders |
Source: `briefcaster.html` lines 46–96, 99.

**Signature gradient:** `linear-gradient(135deg, #10b981 0%, #3b82f6 50%, #8b5cf6 100%)` — the one
multi-color moment on the page; everything else is dark + a single blue accent.

## Typography
- Primary: **Inter** (system-ui fallback) — weights up to 800 (extrabold headline).
- Mono/secondary: **JetBrains Mono** (eyebrow labels, `.mono`).
Source: `briefcaster.html` lines 43–44.

## Motion vocabulary (existing)
- `grad` — 8s gradient drift on headline text.
- `pulse-dot` — 2s opacity pulse on status dots.
- Ambient blur orbs: blue & violet at 4% opacity, `blur-3xl`, static.
- `card-hover` — border/glow transition on hover.
Source: `briefcaster.html` lines 54–96.

## Logo & asset locations
- Site logo: `dcs-landing/logo.png`, `logo-background.png`, `favicon.svg`
- Real app screens: `dcs-landing/screens/bc-{home,player,sources,create,feeds}.png` (300×648)
- Nav mark: inline SVG, emerald (`briefcaster.html` lines 106–109)

## Aspect-ratio matrix (destination → ratio, resolution)
| Destination | Ratio | Target | Notes |
|---|---|---|---|
| Landing hero loop (this brief) | ~4:3 / free | right ~45% of hero, retina-crisp | must not fight left-aligned headline + form; muted; reduced-motion fallback |
| Landing hero still (poster) | matches loop | 2× for retina | first frame == poster |
| OG/link preview | 1.91:1 | 1200×630 | legible at thumbnail |
| Social square | 1:1 | 1080×1080 | |

## Do / Don't (visual) — derived; confirm with operator
- DO: dark canvas (#030712), the emerald→blue→violet gradient as the single color hero moment,
  thin blue hairline grid, subtle glow, real product screens, restrained motion.
- DON'T: off-palette gradients, stock-photo people, faked UI, motion that reduces headline/form
  legibility, on-screen marketing text baked into imagery (text lives in HTML — localization + WCAG).
