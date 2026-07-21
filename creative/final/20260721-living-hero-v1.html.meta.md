# 20260721-living-hero-v1.html
- date: 2026-07-21
- tool: hand-authored (CSS/HTML motion layer — no generation backend)
- model: n/a
- settings: pure CSS keyframes + Canvas-free overlays; ~2 KB; seamless by construction; muted; prefers-reduced-motion fallback
- cost: $0 · 0 credits
- brief: creative/briefs/20260721-briefcaster-hero-loop.md
- applied to: index.html (both phones), briefcaster.html (single large player + hero made 2-col)
- inputs: real screenshots /screens/bc-player.png, /screens/bc-home.png (462×1000)
- coords note: overlay %s tuned to bc-player.png waveform band (~y246–286) + play button (~50%/34%);
  re-tune .bc-waveband / .bc-playring if that screenshot is re-exported
- prompt: |
    n/a — hand-authored. Motion set: sweeping playhead + emerald "played" fill (mix-blend screen)
    over the real waveform, ripple ring on the play button, slow phone float, ambient
    emerald/blue/violet gradient bloom behind the phones. All periodic → no loop seam.
- qa: creative-qa-review 2026-07-21 → SHIP (0 FAIL). Contrast unchanged (text left column, not over
    media): #fff 20.13, #9ca3af 7.93, #10b981 7.94. Reduced-motion honored. No video, no CDN added,
    no React remnants, tag balance OK.
