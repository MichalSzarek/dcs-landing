// Keeps the hand-authored pages consistent without turning them into templates.
//
// Every page still ships as plain HTML, but the parts that must read the same
// everywhere are written in from one place:
//
//   <!-- @nav lang="en" active="/about" ct="landing-about" alt="/briefcaster/pl" -->
//   ...replaced with partials/nav.<lang>.html...
//   <!-- @/nav -->
//
//   <!-- @footer lang="en" -->  ...partials/footer.<lang>.html...  <!-- @/footer -->
//
//   <span data-fact="nip"></span>   ...inner text replaced with site.json's value
//
// `node scripts/sync.mjs` rewrites the pages. `--check` changes nothing and exits
// non-zero when a page is out of date or a fact in site.json is empty, which is
// what `npm run build` (and therefore the Docker build) runs.

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const facts = JSON.parse(readFileSync(join(ROOT, "site.json"), "utf8"));
const partials = new Map();
const partial = name => {
  if (!partials.has(name)) partials.set(name, readFileSync(join(ROOT, "partials", `${name}.html`), "utf8"));
  return partials.get(name);
};

const ACTIVE = 'class="text-sm text-white font-medium" aria-current="page"';
const IDLE = 'class="text-sm text-gray-400 hover:text-white transition-colors"';

const escapeHtml = value =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function attrs(source) {
  return Object.fromEntries([...source.matchAll(/(\w+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
}

function renderNav({ lang = "en", active = "", ct = "landing", alt = "" }) {
  const other = lang === "pl" ? { code: "en", label: "EN" } : { code: "pl", label: "PL" };
  const langLink = alt
    ? `\n        <a href="${alt}" lang="${other.code}" hreflang="${other.code}" ${IDLE}>${other.label}</a>`
    : "";
  return partial(`nav.${lang}`)
    .replace(/\{\{link:([^}]+)\}\}/g, (_, route) => (route === active ? ACTIVE : IDLE))
    .replace(/\{\{lang\}\}/g, langLink)
    .replace(/\{\{ct\}\}/g, ct);
}

function renderFooter({ lang = "en" }) {
  return partial(`footer.${lang}`);
}

const BLOCKS = [
  { name: "nav", render: renderNav },
  { name: "footer", render: renderFooter }
];

const missing = new Set();

function fillFacts(html) {
  return html.replace(
    /(<(\w+)\b[^>]*\bdata-fact="(\w+)"[^>]*>)([^<]*)(<\/\2>)/g,
    (_, open, _tag, key, _old, close) => {
      if (!(key in facts)) throw new Error(`site.json has no fact "${key}"`);
      const value = facts[key];
      if (value === "" || value == null) missing.add(key);
      return `${open}${escapeHtml(value ?? "")}${close}`;
    }
  );
}

function sync(html) {
  let out = html;
  for (const { name, render } of BLOCKS) {
    const pattern = new RegExp(`(<!-- @${name}\\b([^>]*?)-->)[\\s\\S]*?(\\s*<!-- @/${name} -->)`, "g");
    out = out.replace(pattern, (_, open, rawAttrs, close) => `${open}\n${render(attrs(rawAttrs))}${close.trimStart().replace(/^/, "  ")}`);
  }
  return fillFacts(out);
}

const pages = readdirSync(ROOT).filter(f => f.endsWith(".html"));
const stale = [];
for (const file of pages) {
  const path = join(ROOT, file);
  const before = readFileSync(path, "utf8");
  const after = sync(before);
  if (after === before) continue;
  if (CHECK) stale.push(file);
  else writeFileSync(path, after);
}

if (stale.length) console.error(`Out of date, run \`npm run sync\`: ${stale.join(", ")}`);
if (missing.size) {
  console.error(
    `site.json is missing: ${[...missing].join(", ")}. ` +
      "The site shows these on every page; fill them in from the official register, never guess."
  );
}
if (CHECK && (stale.length || missing.size)) process.exit(1);
if (!CHECK) console.log(`synced ${pages.length} pages${missing.size ? " (with missing facts)" : ""}`);
