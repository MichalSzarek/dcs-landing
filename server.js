"use strict";

const crypto = require("crypto");
const path = require("path");

const express = require("express");

const app = express();

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;
const STUDY_ID = "briefcaster-voice-profiles-v1";
const STUDY_VERSION = "2026-07-15";
const VOICE_STUDY_USERNAME = process.env.VOICE_STUDY_USERNAME || "";
const VOICE_STUDY_PASSWORD = process.env.VOICE_STUDY_PASSWORD || "";
const VOICE_STUDY_BUCKET = process.env.VOICE_STUDY_BUCKET || "briefcaster-audio";
const VOICE_STUDY_VOTE_PREFIX = cleanPrefix(
  process.env.VOICE_STUDY_VOTE_PREFIX || "voice-study/votes/voice-profiles-v1"
);

const pageRoutes = new Map([
  ["/", "index.html"],
  ["/about", "about.html"],
  ["/briefcaster", "briefcaster.html"],
  ["/briefcaster/pl", "briefcaster-pl.html"],
  ["/press", "press.html"],
  ["/maths", "maths.html"],
  ["/pricing", "pricing.html"],
  ["/news", "news.html"],
  ["/contact", "contact.html"],
  ["/briefcaster/privacy", "briefcaster-privacy.html"],
  ["/briefcaster/terms", "briefcaster-terms.html"],
  ["/briefcaster/support", "briefcaster-support.html"]
]);

const staticFiles = new Map([
  ["/robots.txt", "robots.txt"],
  ["/sitemap.xml", "sitemap.xml"],
  ["/favicon.svg", "favicon.svg"],
  ["/me.PNG", "me.PNG"],
  ["/logo.png", "logo.png"],
  ["/logo-background.png", "logo-background.png"]
]);

// PL and EN are rated by different cohorts and must never be aggregated into one
// profile-promotion result: Polish testers judge PL (Chirp3-HD), while EN (Kokoro) needs
// native/working-English raters. A vote therefore covers exactly one language track, and
// the cohort is pinned to that track so a PL group cannot submit EN ratings.
const TRACKS = new Map([
  ["pl", { cohort: "pl-native", comparisons: ["pl-single-01", "pl-dialogue-01"] }],
  ["en", { cohort: "en-native", comparisons: ["en-single-01", "en-dialogue-01"] }]
]);

const comparisonIds = new Set([...TRACKS.values()].flatMap(track => track.comparisons));
const dimensions = new Set(["naturalness", "intelligibility", "pronunciation", "pacing", "clean_audio"]);
const reasonIds = new Set(["robotic_voice", "pronunciation", "pace", "artifact", "emphasis"]);

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

app.get(["/_healthz", "/healthz"], (req, res) => {
  res.status(200).type("text/plain").send("ok\n");
});

app.use((req, res, next) => {
  if (req.path === "/voice-study") {
    res.redirect(302, "/voice-study/");
    return;
  }
  next();
});

const studyRouter = express.Router();
studyRouter.use(noStore);
studyRouter.use(requireStudyAuth);
studyRouter.post("/api/votes", express.json({ limit: "128kb", type: "application/json" }), saveVote);
studyRouter.use(
  express.static(path.join(ROOT, "voice-study"), {
    dotfiles: "deny",
    etag: false,
    index: false,
    setHeaders: noStoreHeaders
  })
);
studyRouter.get("/", (req, res) => {
  sendNoStoreFile(res, "voice-study/index.html");
});
app.use("/voice-study", studyRouter);

for (const [route, file] of pageRoutes) {
  app.get(route, (req, res) => sendNoCacheFile(res, file));
}
for (const [route, file] of staticFiles) {
  app.get(route, (req, res) => sendStaticFile(res, file));
}

app.use(
  "/screens",
  express.static(path.join(ROOT, "screens"), {
    dotfiles: "deny",
    immutable: true,
    maxAge: "1y"
  })
);

app.use((req, res) => {
  res.status(404);
  sendNoCacheFile(res, "404.html");
});

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    res.status(400).json({ ok: false, error: "invalid_json" });
    return;
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`dcs-landing listening on ${PORT}`);
});

function requireStudyAuth(req, res, next) {
  if (!VOICE_STUDY_USERNAME || !VOICE_STUDY_PASSWORD) {
    requestAuth(res);
    return;
  }

  const header = req.get("authorization") || "";
  const match = header.match(/^Basic\s+(.+)$/i);
  if (!match) {
    requestAuth(res);
    return;
  }

  let decoded = "";
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    requestAuth(res);
    return;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) {
    requestAuth(res);
    return;
  }

  const username = decoded.slice(0, separator);
  const password = decoded.slice(separator + 1);
  if (safeEqual(username, VOICE_STUDY_USERNAME) && safeEqual(password, VOICE_STUDY_PASSWORD)) {
    next();
    return;
  }

  requestAuth(res);
}

function requestAuth(res) {
  res.setHeader("WWW-Authenticate", 'Basic realm="Briefcaster voice study", charset="UTF-8"');
  res.status(401).type("text/plain").send("Authentication required\n");
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function noStore(req, res, next) {
  noStoreHeaders(res);
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  next();
}

function noStoreHeaders(res) {
  res.setHeader("Cache-Control", "private, no-store");
}

function sendNoStoreFile(res, file) {
  noStoreHeaders(res);
  res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  res.sendFile(path.join(ROOT, file));
}

function sendNoCacheFile(res, file) {
  res.setHeader("Cache-Control", "no-cache, must-revalidate");
  res.sendFile(path.join(ROOT, file));
}

function sendStaticFile(res, file) {
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.sendFile(path.join(ROOT, file));
}

async function saveVote(req, res) {
  const validation = validateVote(req.body);
  if (!validation.ok) {
    res.status(400).json({ ok: false, error: validation.error });
    return;
  }

  const receivedAt = new Date();
  const participantId = req.body.participant_id;
  const objectName = voteObjectName(participantId, req.body.track, receivedAt);
  const storedVote = {
    ...req.body,
    server_received_at: receivedAt.toISOString(),
    server_study_version: STUDY_VERSION,
    request_context: {
      user_agent: req.get("user-agent") || null
    }
  };

  try {
    await uploadJsonToGcs(VOICE_STUDY_BUCKET, objectName, storedVote);
  } catch (error) {
    console.error("Failed to save voice study vote", error);
    res.status(502).json({ ok: false, error: "vote_save_failed" });
    return;
  }

  res.status(201).json({
    ok: true,
    receipt: objectName,
    received_at: receivedAt.toISOString()
  });
}

function validateVote(vote) {
  if (!vote || typeof vote !== "object" || Array.isArray(vote)) return invalid("body_must_be_object");
  if (vote.schema_version !== 3) return invalid("unsupported_schema_version");
  if (vote.study_id !== STUDY_ID) return invalid("unexpected_study_id");
  if (vote.assignment_version !== "fnv1a-v1") return invalid("unexpected_assignment_version");
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(vote.participant_id || "")) return invalid("invalid_participant_id");
  if (!isIsoDate(vote.created_at)) return invalid("invalid_created_at");

  const track = TRACKS.get(vote.track);
  if (!track) return invalid("unknown_track");
  // The cohort is pinned to the track it rated, so a vote can never claim to be
  // PL-native judgement of the EN voices (or vice versa).
  if (vote.cohort !== track.cohort) return invalid("cohort_track_mismatch");

  if (!Array.isArray(vote.answers) || vote.answers.length !== track.comparisons.length) {
    return invalid("invalid_answer_count");
  }

  const seen = new Set();
  for (const answer of vote.answers) {
    const result = validateAnswer(answer);
    if (!result.ok) return result;
    // Reject answers belonging to a different language track than the one declared.
    if (!track.comparisons.includes(answer.comparison_id)) return invalid("comparison_outside_track");
    if (seen.has(answer.comparison_id)) return invalid("duplicate_comparison_id");
    seen.add(answer.comparison_id);
  }

  for (const id of track.comparisons) {
    if (!seen.has(id)) return invalid("missing_comparison_id");
  }

  return { ok: true };
}

function validateAnswer(answer) {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return invalid("answer_must_be_object");
  if (!comparisonIds.has(answer.comparison_id)) return invalid("unknown_comparison_id");
  if (!["a", "b", "tie"].includes(answer.preference)) return invalid("invalid_preference");

  if (!answer.display_map || typeof answer.display_map !== "object") return invalid("missing_display_map");
  if (!["a", "b"].includes(answer.display_map.a) || !["a", "b"].includes(answer.display_map.b)) {
    return invalid("invalid_display_map");
  }
  if (answer.display_map.a === answer.display_map.b) return invalid("duplicate_display_map");

  if (!answer.ratings || typeof answer.ratings !== "object") return invalid("missing_ratings");
  for (const side of ["a", "b"]) {
    const sideRatings = answer.ratings[side];
    if (!sideRatings || typeof sideRatings !== "object") return invalid("missing_side_ratings");
    for (const dimension of dimensions) {
      if (!Number.isInteger(sideRatings[dimension]) || sideRatings[dimension] < 1 || sideRatings[dimension] > 5) {
        return invalid("invalid_rating");
      }
    }
  }

  if (!answer.reasons || typeof answer.reasons !== "object") return invalid("missing_reasons");
  for (const side of ["a", "b"]) {
    if (!Array.isArray(answer.reasons[side])) return invalid("invalid_reasons");
    for (const reason of answer.reasons[side]) {
      if (!reasonIds.has(reason)) return invalid("unknown_reason");
    }
  }

  return { ok: true };
}

function invalid(error) {
  return { ok: false, error };
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

// Votes are partitioned by language track, so aggregating one track can never
// pick up the other's ratings by globbing a shared prefix.
function voteObjectName(participantId, track, receivedAt) {
  const day = receivedAt.toISOString().slice(0, 10);
  const timestamp = receivedAt.toISOString().replace(/[:.]/g, "-");
  const safeParticipant = participantId.replace(/[^A-Za-z0-9_-]/g, "_");
  return `${VOICE_STUDY_VOTE_PREFIX}/${track}/${day}/${safeParticipant}-${timestamp}-${crypto.randomUUID()}.json`;
}

function cleanPrefix(prefix) {
  return String(prefix).replace(/^\/+|\/+$/g, "");
}

async function uploadJsonToGcs(bucket, objectName, value) {
  const token = await accessToken();
  const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`);
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", objectName);
  url.searchParams.set("ifGenerationMatch", "0");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(value, null, 2) + "\n"
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`GCS upload failed with ${response.status}: ${body.slice(0, 400)}`);
  }
}

async function accessToken() {
  if (process.env.GCS_ACCESS_TOKEN) {
    return process.env.GCS_ACCESS_TOKEN;
  }

  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  if (!response.ok) {
    throw new Error(`metadata token request failed with ${response.status}`);
  }
  const token = await response.json();
  if (!token.access_token) {
    throw new Error("metadata token response did not include access_token");
  }
  return token.access_token;
}
