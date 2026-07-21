# Brief: Briefcaster landing hero — graphic + seamless loop

- date: 2026-07-21
- slug: briefcaster-hero-loop
- requested by: operator ("creative-director: hero graphic + seamless loop for dcs-landing/briefcaster.htm")
- persona: creative-director (creative-studio-pack)
- surface: `dcs-landing/briefcaster.html` HERO section (lines 138–192)

## Goal
Give the hero a living visual anchor. Today the hero is text-left with empty right space and two
static 4%-opacity blur orbs. Add (1) a **hero graphic** and (2) a **seamless loop** that reinforces
the product's core idea — *your day, as a personal audio brief* — without competing with the
left-aligned headline + waitlist form.

## Destination & ratio (from BRAND_KIT matrix)
- Hero loop: occupies the right ~45% on desktop (`md+`), full-bleed ambient behind text on mobile.
- Must be muted, seamless, and ship a `prefers-reduced-motion` static fallback (= the poster still).
- Budget: if generated video → ≤4 MB (mp4 +faststart + webm + poster). If CSS/Canvas → a few KB.

## Constraints (hard)
- Palette locked to BRAND_KIT: canvas #030712, gradient #10b981→#3b82f6→#8b5cf6, blue accent #3b82f6.
- No baked-in text in the visual (text stays in HTML — WCAG + PL/EN localization).
- Headline + form legibility is non-negotiable; motion stays ambient, never strobing.
- Additive change to `briefcaster.html` — do not disturb the existing nav/copy/form.

## Concept directions (live Artifact concept board — real tokens, dark theme)
Board (running loops, in-situ hero): https://claude.ai/code/artifact/53b3df58-02b3-48fd-a8fe-0e9f7055a960

- **A — Living waveform**: an emerald→blue→violet voice waveform that breathes like speech. Direct
  "audio brief" metaphor; periodic → seamless by construction.
- **B — Signal → brief orb**: scattered source nodes (topics/RSS/YouTube) drift inward and coalesce
  into one pulsing audio orb. Strongest narrative ("we turn your scattered sources into one brief").
- **C — Dawn dial**: soft dawn-gradient arc + slow concentric audio dial. Leans on "your day" /
  morning-ritual mood.

## Scope correction (2026-07-21, after operator feedback)
The `index.html` homepage hero ALREADY has two real phone mockups (`bc-player.png`, `bc-home.png`,
static PNGs). `briefcaster.html` product hero has an empty right side. Operator decision:
- **Surface: BOTH** (`index.html` + `briefcaster.html`).
- **Treatment: bring the real screenshots alive** — do NOT replace real UI with generated art.
  Motion layer overlaid on the real phones: playing waveform (sweeping playhead + emerald fill over
  the real player waveform), pulse ring on play button, gentle float, ambient gradient bloom behind.
- `briefcaster.html` (no phone in hero today) gets a live phone cluster added to fill the empty right.

## Tool choices (recorded)
- Recommendation given: native CSS/Canvas overlay (free, seamless, ~KB, reduced-motion-native).
  Alternative offered: Higgsfield generated video (credits) — declined for this hero.
- **Operator choice: native CSS/Canvas overlay on real screenshots. $0, 0 credits.**

## Preview (approval gate)
Living-hero before/after (real embedded phones + motion layer):
https://claude.ai/code/artifact/d88be61b-6675-496a-a908-b11080ecefb9

## Assets produced (approved)
- `creative/final/20260721-living-hero-v1.html` (+ `.meta.md`) — the CSS/HTML motion layer.
- Applied inline to:
  - `index.html` — `<style>` block + hero screenshots div (both phones; player alive, home float).
  - `briefcaster.html` — `<style>` block + hero restructured to `lg:grid-cols-2`; single large live
    player added to the previously-empty right; headline eased `md:text-7xl`→`md:text-6xl` for the
    narrower column.
- Motion set: sweeping playhead + emerald "played" fill over the real waveform, ripple ring on the
  play button, slow phone float, ambient emerald/blue/violet bloom behind the phones. All periodic
  → no loop seam. ~2 KB, muted, reduced-motion fallback. $0 / 0 credits.

## QA verdict — creative-qa-review 2026-07-21
FINDINGS: 0 FAIL, 0 KNOWN_GAP, 0 PASS-with-note
VERDICT: **SHIP**
- A Contrast: text unchanged and in the left column (not over media) — #fff 20.13, #9ca3af 7.93,
  #10b981 7.94 (all ≥ AA). PASS.
- B A11y: meaningful `alt` on all hero imgs; decorative overlays `aria-hidden`; `prefers-reduced-motion`
  honored in both files; one `<h1>` each; no text-in-image; no autoplay video. PASS.
- C Brand: only kit hexes; typography untouched; real UI kept; no fabricated feature. PASS.
- D Motion: CSS-only (ffmpeg seam / 4 MB / poster N/A); seamless by construction. PASS.
- E Code: no React/JSX remnants; no new CDN (tailwind + google-fonts only, pre-existing); tag balance
  OK (html.parser); pages serve 200 with overlays present. PASS.

## Operator-only steps remaining (owners)
- **Eyeball the two live pages** locally (`node server.js` or any static serve) — motion can't be
  self-verified headless; the approved preview matches the applied technique 1:1.
- **Commit** the `creative/` library + brief + the two edited HTML files (dcs-landing) — operator.
- **Deploy** the landing — operator / bc-growth-ops.
