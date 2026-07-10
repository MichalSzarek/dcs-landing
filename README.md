# dcs-landing

Static marketing site for **Data Concept Studio** — https://dataconceptstudio.com

Plain hand-authored HTML (Tailwind via CDN, no build step). Pages:

| Route | File |
|---|---|
| `/` | `index.html` — company homepage |
| `/briefcaster` | `briefcaster.html` — Briefcaster product page |
| `/maths` | `maths.html` — MATHS product page |
| `/about` | `about.html` — company + team |
| `/contact` | `contact.html` |
| `/briefcaster/privacy\|terms\|support` | `briefcaster-*.html` — app legal pages (linked from the iOS app / App Store Connect) |

## Deployment — Cloud Run (nginx), NOT Firebase

⚠️ The live site is served by the **Cloud Run service `dcs-landing`** (nginx:alpine, see
`Dockerfile` + `nginx.conf`). The `firebase.json` / `.firebaserc` files exist only for
config parity — do **not** run `firebase deploy`.

Both `dataconceptstudio.com` and `www.dataconceptstudio.com` are domain-mapped to the
Cloud Run service.

### Deploy

```bash
gcloud run deploy dcs-landing --source . --project data-concept-studio --region europe-west1
```

### Verify locally before deploying

```bash
docker build -t dcs-landing-test .
docker run --rm -d -p 8080:8080 --name dcs-test dcs-landing-test
for p in / /briefcaster /maths /about /contact /briefcaster/privacy /briefcaster/terms /briefcaster/support /robots.txt /sitemap.xml /favicon.svg; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "http://localhost:8080$p"
done
curl -s -o /dev/null -w "%{http_code}  /nonexistent (expect 404)\n" http://localhost:8080/nonexistent
docker stop dcs-test
```

### Adding a page

1. Create `<name>.html` at the repo root (copy nav/footer from an existing page).
2. Add a `location = /<name>` block in `nginx.conf` **and** a rewrite in `firebase.json`.
3. Add the file to the `COPY` list in `Dockerfile`.
4. Add the URL to `sitemap.xml`.
