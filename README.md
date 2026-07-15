# dcs-landing

Marketing site for **Data Concept Studio** — https://dataconceptstudio.com

Plain hand-authored HTML served by a small Node/Express Cloud Run app. Pages:

| Route | File |
|---|---|
| `/` | `index.html` — company homepage |
| `/briefcaster` | `briefcaster.html` — Briefcaster product page |
| `/maths` | `maths.html` — MATHS product page |
| `/about` | `about.html` — company + team |
| `/contact` | `contact.html` |
| `/briefcaster/privacy\|terms\|support` | `briefcaster-*.html` — app legal pages (linked from the iOS app / App Store Connect) |
| `/voice-study/` | `voice-study/index.html` — password-protected internal blind listening study |

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
for p in / /briefcaster /maths /about /contact /briefcaster/privacy /briefcaster/terms /briefcaster/support /robots.txt /sitemap.xml /favicon.svg /_healthz; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "http://localhost:8080$p"
done
curl -s -o /dev/null -w "%{http_code}  /voice-study/ unauthenticated (expect 401)\n" http://localhost:8080/voice-study/
curl -s -u briefcaster:local-test -o /dev/null -w "%{http_code}  /voice-study/ authenticated\n" http://localhost:8080/voice-study/
curl -s -o /dev/null -w "%{http_code}  /nonexistent (expect 404)\n" http://localhost:8080/nonexistent
docker stop dcs-test
```

### Adding a page

1. Create `<name>.html` at the repo root (copy nav/footer from an existing page).
2. Add the route in `server.js` **and**, for public marketing pages only, a rewrite in `firebase.json`.
3. Add the file to the `COPY` list in `Dockerfile`.
4. Add the URL to `sitemap.xml`.
