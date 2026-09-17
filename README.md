# dcs-landing

Company site for **Data Concept Studio**, the makers of **Briefcaster** — https://dataconceptstudio.com

Plain hand-authored HTML served by a small Node/Express Cloud Run app.

The site's job is to show, to a listener or to an automated reviewer (the Google for Startups
Cloud Program rejected the previous two-product version twice), that Data Concept Studio is a
real software company with **one** product it owns. So:

- **One product.** Briefcaster is the only product presented. `/maths` 301s to `/`; the
  previous version lives on the branch `archive/two-products-2026-09-16`.
- **Never "studio" as a description.** The word appears only inside the company name; the
  company is a *software company*. No client-work, consulting or agency language.
- **Facts come from `site.json`.** Legal name, NIP, REGON and the App Store seller name are
  written into every element carrying `data-fact="<key>"`. An empty value fails the build, so
  the image cannot be built with a missing registration number. Never guess one.
  VAT registration is not the business start date. Do not publish a founding year or
  JSON-LD `foundingDate` until the actual business start date is verified in CEIDG.
- **Nav and footer come from `partials/`** (EN and PL). Pages mark the spot with
  `<!-- @nav lang="en" active="/about" ct="landing-about" alt="" -->` … `<!-- @/nav -->` and
  `<!-- @footer lang="en" -->` … `<!-- @/footer -->`; `npm run sync` rewrites them in place.
- **One public address.** `www.` 301s to the apex, trailing slashes 301 to the bare path, and
  reviewer probes (`/team`, `/product`, `/legal`, `/privacy`, …) 301 to the page that answers them.
- **Every contact address is on the company domain.**

| Route | File |
|---|---|
| `/` | `index.html` — company homepage, led by Briefcaster |
| `/briefcaster` | `briefcaster.html` — product page (EN) |
| `/briefcaster/pl` | `briefcaster-pl.html` — product page (PL) |
| `/about` | `about.html` — company facts, how to verify us, founder |
| `/pricing` | `pricing.html` — pricing and business model |
| `/news` | `news.html` — shipped-work log |
| `/contact` | `contact.html` |
| `/press` | `press.html` — press kit (PL+EN) |
| `/briefcaster/privacy\|terms\|support` | `briefcaster-*.html` — app legal pages (linked from the iOS app / App Store Connect) |
| `/briefcaster/delete-account` | `briefcaster-delete-account.html` — account-deletion instructions (PL+EN). **Google Play requires this URL to be live before the first AAB upload.** |
| `/lustre/privacy\|terms\|support` | `lustre-*.html` — Lustre iOS app legal pages. **The exact URLs are hard-coded in the shipped app** — never rename. Served with `X-Robots-Tag: noindex` and kept out of the sitemap and navigation; `/lustre` itself is intentionally unrouted. |
| `/voice-study/` | `voice-study/index.html` — password-protected internal blind listening study |

## Build and verify

```bash
npm ci
npm run sync        # write partials/ and site.json facts into the pages
npm test            # sync --check + compile app.css + tests/site.test.mjs against a local server
BASE_URL=https://dataconceptstudio.com node --test tests/site.test.mjs   # same checks on production
```

`app.css` is compiled with Tailwind **3.4.17** (the version the Play CDN served, so pages look
the same) and is not committed; the Dockerfile builds it.

## Deployment — Cloud Run Node, NOT Firebase

⚠️ The live site is served by the **Cloud Run service `dcs-landing`** (`Dockerfile` +
`server.js`). The `firebase.json` / `.firebaserc` files exist only for historical config parity —
do **not** run `firebase deploy`. Firebase is not able to enforce the private voice-study auth/API
path used here, and `voice-study/**` is ignored there on purpose.

Both `dataconceptstudio.com` and `www.dataconceptstudio.com` are domain-mapped to the
Cloud Run service.

### Internal Voice Study

`/voice-study/` is deliberately absent from navigation, `robots.txt`, and the sitemap. It is
protected by server-side Basic Auth, not a client-side password. Submitted answers are validated by
`POST /voice-study/api/votes` and written to GCS as JSON.

#### Language tracks — PL and EN are never mixed

PL (Google Chirp3-HD) and EN (Kokoro) are judged by **different cohorts**: Polish testers rate PL,
while EN needs native / working-English raters. A Polish group must not decide EN naturalness, so
**one session rates exactly one track** and the two are never aggregated into a single
profile-promotion result.

| Track | Comparisons | Cohort | Entry |
|---|---|---|---|
| `pl` | `pl-single-01`, `pl-dialogue-01` | `pl-native` | default |
| `en` | `en-single-01`, `en-dialogue-01` | `en-native` | picker, or `?track=en` |

The intro step asks the rater to self-declare which language they judge (PL preselected). The
declaration is recorded on the vote as `track` + `cohort` — it is **self-declared, not verified**,
so aggregation should treat `cohort` as an auditable claim rather than ground truth.

Separation is enforced in three places:

- **Client** — only the active track's comparisons are rendered.
- **Server** (`validateVote`) — rejects `unknown_track`, `cohort_track_mismatch`,
  `comparison_outside_track`, and a wrong answer count.
- **Storage** — votes are partitioned by track, so globbing one track can never pick up the other.

⚠️ The EN track's UI is still Polish. Localise it before sending `?track=en` to native speakers.

Required runtime configuration:

| Variable | Example | Purpose |
|---|---|---|
| `VOICE_STUDY_USERNAME` | `briefcaster` | Basic Auth username |
| `VOICE_STUDY_PASSWORD` | Secret Manager value | Basic Auth password |
| `VOICE_STUDY_BUCKET` | `briefcaster-audio` | GCS bucket for vote JSON |
| `VOICE_STUDY_VOTE_PREFIX` | `voice-study/votes/voice-profiles-v1` | GCS object prefix (track is appended) |

The Cloud Run runtime service account needs `roles/secretmanager.secretAccessor` on the password
secret and `roles/storage.objectCreator` on the target bucket.

```bash
gcloud run deploy dcs-landing --source . --project data-concept-studio --region europe-west1 \
  --allow-unauthenticated \
  --set-env-vars VOICE_STUDY_USERNAME=briefcaster,VOICE_STUDY_BUCKET=briefcaster-audio,VOICE_STUDY_VOTE_PREFIX=voice-study/votes/voice-profiles-v1 \
  --set-secrets VOICE_STUDY_PASSWORD=dcs-landing-voice-study-password:latest
```

Votes are saved under a **track-partitioned** prefix — aggregate one track by globbing its own
path, never the shared parent:

```text
gs://briefcaster-audio/voice-study/votes/voice-profiles-v1/pl/YYYY-MM-DD/
gs://briefcaster-audio/voice-study/votes/voice-profiles-v1/en/YYYY-MM-DD/
```

Vote payload is `schema_version: 3` (`track` + `cohort` added, `answers` cover one track only).
Each answer carries its own `display_map`, and `participant_id` is stored canonicalised
(trim + upper-case) — so `hash(participant_id as stored)` reproduces the `fnv1a-v1` A/B assignment.

### Deploy

```bash
gcloud run deploy dcs-landing --source . --project data-concept-studio --region europe-west1
```

### Verify locally before deploying

```bash
docker build -t dcs-landing-test .
docker run --rm -d -p 8080:8080 --name dcs-test \
  -e VOICE_STUDY_USERNAME=briefcaster \
  -e VOICE_STUDY_PASSWORD=local-test \
  -e VOICE_STUDY_BUCKET=briefcaster-audio \
  dcs-landing-test
for p in / /briefcaster /about /pricing /contact /briefcaster/privacy /briefcaster/terms /briefcaster/support /briefcaster/delete-account /lustre/privacy /lustre/terms /lustre/support /robots.txt /sitemap.xml /favicon.svg /_healthz; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "http://localhost:8080$p"
done
curl -s -o /dev/null -w "%{http_code}  /voice-study/ unauthenticated (expect 401)\n" http://localhost:8080/voice-study/
curl -s -u briefcaster:local-test -o /dev/null -w "%{http_code}  /voice-study/ authenticated\n" http://localhost:8080/voice-study/
curl -s -o /dev/null -w "%{http_code}  /nonexistent (expect 404)\n" http://localhost:8080/nonexistent
docker stop dcs-test
```

### Adding a page

1. Create `<name>.html` at the repo root with the `@nav` / `@footer` markers and
   `<link rel="stylesheet" href="/app.css">`, then run `npm run sync`.
2. Add the route in `server.js`.
3. Add the file to the `COPY` list in `Dockerfile`.
4. Add the URL to `sitemap.xml` (public company pages only) and, if it presents the company,
   to `MARKETING` in `tests/site.test.mjs`.
