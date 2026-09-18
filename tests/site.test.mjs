// Verification suite for dataconceptstudio.com.
//
// The site exists to show, to a person or an automated reviewer, that Data
// Concept Studio is a real software company with one real product. These tests
// pin the things that decide that: every page answers, nothing on the site
// describes the company as a studio/agency or mentions a product it does not
// sell, the company facts are filled in, and there is exactly one public address.
//
//   npm test                          boots server.js locally
//   BASE_URL=https://dataconceptstudio.com node --test tests/site.test.mjs
//                                     runs the same checks against production

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import https from "node:https";
import { readFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CANONICAL = "https://dataconceptstudio.com";

let base = process.env.BASE_URL?.replace(/\/$/, "");
const local = !base;
let server;

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

before(async () => {
  if (!local) return;
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), VOICE_STUDY_USERNAME: "", VOICE_STUDY_PASSWORD: "" },
    stdio: ["ignore", "pipe", "inherit"]
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("server did not start")), 10_000);
    server.stdout.on("data", chunk => {
      if (String(chunk).includes("listening")) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
});

after(() => server?.kill());

// Plain request without following redirects; `host` can be overridden, which
// fetch() does not allow.
function get(path, { host } = {}) {
  const url = new URL(path, base);
  const client = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      { method: "GET", headers: host ? { host } : {}, servername: url.hostname },
      res => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", chunk => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, headers: res.headers, body }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

const visibleText = html =>
  html
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const sitemapPaths = () =>
  [...readFileSync(join(ROOT, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map(m =>
    m[1].replace(CANONICAL, "") || "/"
  );

// Pages that present the company, as opposed to the app's legal documents.
const MARKETING = ["/", "/briefcaster", "/briefcaster/pl", "/about", "/pricing", "/news", "/contact", "/press"];

const pages = new Map();
async function page(path) {
  if (!pages.has(path)) pages.set(path, await get(path));
  return pages.get(path);
}

describe("pages", () => {
  test("every sitemap URL answers 200 with one h1 and a canonical to itself", async () => {
    for (const path of sitemapPaths()) {
      const res = await page(path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers["content-type"], /text\/html/, path);
      assert.equal((res.body.match(/<h1[\s>]/g) || []).length, 1, `${path} must have exactly one h1`);
      const canonical = res.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      assert.equal(canonical?.replace(/\/$/, ""), `${CANONICAL}${path}`.replace(/\/$/, ""), path);
    }
  });

  test("every company page is in the sitemap and names the company", async () => {
    const listed = new Set(sitemapPaths());
    for (const path of MARKETING) {
      assert.ok(listed.has(path), `${path} missing from sitemap.xml`);
      const { body } = await page(path);
      assert.match(body, /<title>[^<]*Data Concept Studio[^<]*<\/title>/, path);
    }
  });

  test("the home page leads with the company and its one product", async () => {
    const { body } = await page("/");
    const h1 = visibleText(body.match(/<h1[\s\S]*?<\/h1>/)[0]);
    assert.match(h1, /Briefcaster/);
    const opening = visibleText(body).slice(0, 1500);
    for (const fact of ["Data Concept Studio", "consumer AI company", "Kraków", "App Store", "Briefcaster", "own and operate"]) {
      assert.ok(opening.includes(fact), `first screen should say "${fact}"`);
    }
    assert.match(body, /https:\/\/apps\.apple\.com\/app\/apple-store\/id6786799275/);
  });

  test("there is enough to read", async () => {
    let total = 0;
    for (const path of sitemapPaths()) total += visibleText((await page(path)).body).length;
    assert.ok(visibleText((await page("/")).body).length >= 6000, "home page under 6,000 characters");
    assert.ok(visibleText((await page("/about")).body).length >= 6000, "about page under 6,000 characters");
    assert.ok(total >= 40000, `site has ${total} characters`);
  });

  test("structured data parses and describes the company, its founder and the app", async () => {
    const types = new Set();
    for (const path of [...MARKETING, "/"]) {
      for (const [, raw] of (await page(path)).body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        const data = JSON.parse(raw);
        for (const node of data["@graph"] || [data]) types.add(node["@type"]);
      }
    }
    for (const type of ["Organization", "Person", "MobileApplication"]) assert.ok(types.has(type), type);
    const about = (await page("/about")).body;
    assert.match(about, /"sameAs": \["https:\/\/www\.linkedin\.com\/in\/miszu"\]/);
  });

  test("the stylesheet is served by the site, not built in the browser", async () => {
    for (const path of sitemapPaths()) assert.doesNotMatch((await page(path)).body, /cdn\.tailwindcss\.com/, path);
    const css = await get("/app.css");
    assert.equal(css.status, 200);
    assert.match(css.headers["content-type"], /text\/css/);
    assert.ok(css.body.length > 5000);
  });

  test("unknown paths return a real 404 that is not indexed", async () => {
    for (const path of ["/does-not-exist", "/wp-admin", "/briefcaster/nope"]) {
      const res = await get(path);
      assert.equal(res.status, 404, path);
      assert.match(res.body, /name="robots" content="noindex"/);
      assert.match(res.body, /<h1/);
    }
  });

  test("every internal link resolves", async () => {
    const seen = new Map();
    for (const path of [...sitemapPaths(), "/does-not-exist"]) {
      const { body } = await get(path);
      for (const [, href] of body.matchAll(/href="(\/[^"#]*)/g)) {
        if (!seen.has(href)) seen.set(href, (await get(href.replace(/&amp;/g, "&"))).status);
        assert.ok([200, 301].includes(seen.get(href)), `${path} links to ${href} (${seen.get(href)})`);
      }
    }
  });
});

describe("what the site says", () => {
  const publicPaths = () => [...sitemapPaths(), "/does-not-exist"];

  test("no other product is presented", async () => {
    for (const path of publicPaths()) {
      const text = (await get(path)).body;
      assert.doesNotMatch(text, /maths/i, `${path} mentions MATHS`);
      assert.doesNotMatch(text, /lustre/i, `${path} mentions Lustre`);
      assert.doesNotMatch(text, /\btrading (platform|process|system|signals)|\bportfolio\b|\bhedge\b/i, `${path} mentions trading`);
    }
  });

  test("the company is never described as a studio or an agency", async () => {
    const banned = [
      /(?<!Concept )\bstudi[oa]\b/i, // the word is only ever part of the company name
      /\bproduct studio\b/i,
      /\bstudio produkt/i,
      /\bour clients\b/i,
      /\bfor clients\b/i,
      /\bbespoke\b/i,
      /\bdelivering complex projects\b/i,
      /\bleading engineering teams\b/i,
      /\bhire us\b/i,
      /\bwe help (companies|businesses)\b/i
    ];
    for (const path of publicPaths()) {
      const text = visibleText((await get(path)).body);
      for (const pattern of banned) assert.doesNotMatch(text, pattern, `${path}: ${pattern}`);
    }
  });

  test("every contact address is on the company domain", async () => {
    for (const path of publicPaths()) {
      const { body } = await get(path);
      assert.doesNotMatch(body, /@gmail\.com/i, path);
      for (const [, address] of body.matchAll(/mailto:([^"?]+)/g)) {
        assert.match(address, /@dataconceptstudio\.com$/, `${path}: ${address}`);
      }
    }
  });

  test("no page invents numbers the company cannot back", async () => {
    for (const path of publicPaths()) {
      const text = visibleText((await get(path)).body);
      assert.doesNotMatch(text, /\b\d[\d,.]*\s*(k\+?|\+)?\s*(users|downloads|listeners|customers)\b/i, path);
    }
  });
});

describe("company facts", () => {
  test("site.json has every fact the pages show", () => {
    const facts = JSON.parse(readFileSync(join(ROOT, "site.json"), "utf8"));
    const empty = Object.entries(facts).filter(([, v]) => v === "" || v == null).map(([k]) => k);
    assert.deepEqual(empty, [], `fill in site.json from the official register: ${empty.join(", ")}`);
    assert.match(facts.nip, /^\d{10}$/, "NIP is ten digits");
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const checksum = weights.reduce((sum, w, i) => sum + w * Number(facts.nip[i]), 0) % 11;
    assert.equal(checksum, Number(facts.nip[9]), "NIP checksum");
    assert.match(facts.regon, /^(\d{9}|\d{14})$/, "REGON is nine or fourteen digits");
  });

  test("no fact renders empty on any page", async () => {
    for (const path of [...sitemapPaths(), "/does-not-exist"]) {
      const { body } = await get(path);
      for (const [, key, value] of body.matchAll(/data-fact="(\w+)"[^>]*>([^<]*)</g)) {
        assert.notEqual(value.trim(), "", `${path} shows an empty ${key}`);
      }
    }
  });

  test("the registered details are on the about and contact pages", async () => {
    for (const path of ["/about", "/contact"]) {
      const text = visibleText((await page(path)).body);
      // Must match the Ministry of Finance VAT register for this NIP exactly.
      for (const label of ["NIP", "9691673171", "REGON", "542296618", "Michał Szarek", "Kraków"]) {
        assert.ok(text.includes(label), `${path} should show ${label}`);
      }
    }
    const about = visibleText((await page("/about")).body);
    assert.ok(about.includes("MICHAŁ JERZY SZAREK M"), "App Store seller name, exactly as Apple shows it");
    assert.ok(about.includes("15 September 2025"), "VAT registration date");
    assert.doesNotMatch(about, /registered in Kraków/i, "the registers do not give Kraków as the registered address");
  });
});

describe("addresses", () => {
  test("www redirects permanently to the apex, keeping the path", { skip: !local && "production www is checked by the domain mapping" }, async () => {
    const res = await get("/about?x=1", { host: "www.dataconceptstudio.com" });
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, `${CANONICAL}/about?x=1`);
  });

  test("the retired product page and reviewer probes land on real pages", async () => {
    const expected = {
      "/maths": "/",
      "/maths/anything": "/",
      "/team": "/about#founder",
      "/product": "/briefcaster",
      "/legal": "/about#company-facts",
      "/privacy": "/briefcaster/privacy",
      "/terms": "/briefcaster/terms",
      "/support": "/briefcaster/support",
      "/business-model": "/pricing"
    };
    for (const [from, to] of Object.entries(expected)) {
      const res = await get(from);
      assert.equal(res.status, 301, from);
      assert.equal(res.headers.location, to, from);
      assert.equal((await get(to.split("#")[0])).status, 200, to);
    }
  });

  test("a trailing slash redirects to the canonical path", async () => {
    const res = await get("/about/?x=1");
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, "/about?x=1");
  });

  test("the other app's legal pages still resolve but stay out of search and the sitemap", async () => {
    const listed = sitemapPaths();
    for (const path of ["/lustre/privacy", "/lustre/terms", "/lustre/support"]) {
      const res = await get(path);
      assert.equal(res.status, 200, path);
      assert.match(res.headers["x-robots-tag"] || "", /noindex/, path);
      assert.ok(!listed.includes(path), `${path} must not be in the sitemap`);
    }
  });

  test("the private voice study stays private", async () => {
    const res = await get("/voice-study/");
    assert.equal(res.status, 401);
  });

  test("health check answers", async () => {
    assert.equal((await get("/_healthz")).body.trim(), "ok");
  });
});
