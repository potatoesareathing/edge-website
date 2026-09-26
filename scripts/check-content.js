/* ============================================================================
   EDGE — CONTENT CHECK
   ----------------------------------------------------------------------------
   Run this after editing js/content.js, before you commit:

       node scripts/check-content.js

   It answers two questions:

     1. Did I break the file?  A missing comma or an unclosed quote in
        content.js empties the ENTIRE site, because every renderer loses its
        data at once. This catches that in one second instead of after you
        have pushed it.

     2. Does the content make sense?  Wrong date formats, links missing
        https://, images that do not exist on disk, placeholder text still
        left in. None of these break the site loudly — they just make it
        wrong in public.

   Needs nothing installed. Node.js only, which you already have.
   ========================================================================== */

"use strict";

const fs   = require("fs");
const vm   = require("vm");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const FILE = path.join(ROOT, "js", "content.js");

const C = { red: "\x1b[31m", grn: "\x1b[32m", yel: "\x1b[33m",
            dim: "\x1b[2m", b: "\x1b[1m", off: "\x1b[0m" };

let errors = 0, warnings = 0;
const err  = (m, d) => { errors++;   console.log(`  ${C.red}ERROR${C.off}  ${m}`);
                         if (d) console.log(`         ${C.dim}${d}${C.off}`); };
const warn = (m, d) => { warnings++; console.log(`  ${C.yel}WARN ${C.off}  ${m}`);
                         if (d) console.log(`         ${C.dim}${d}${C.off}`); };
const ok   = (m)    => console.log(`  ${C.grn}ok${C.off}     ${m}`);

console.log(`\n${C.b}EDGE — content check${C.off}`);
console.log(`${C.dim}────────────────────────────────────────────────────────${C.off}`);

/* -- 1. Does the file even parse? ----------------------------------------- */

let EDGE;
try {
  const src = fs.readFileSync(FILE, "utf8");
  const sandbox = {};
  vm.runInNewContext(src + "\n;__result = EDGE;", sandbox, { filename: "content.js" });
  EDGE = sandbox.__result;
} catch (e) {
  console.log(`\n  ${C.red}${C.b}content.js has a syntax error.${C.off}`);
  console.log(`  ${C.red}${e.message}${C.off}\n`);
  const m = /content\.js:(\d+)/.exec(e.stack || "");
  if (m) {
    const line = Number(m[1]);
    console.log(`  ${C.b}Around line ${line}:${C.off}`);
    const lines = fs.readFileSync(FILE, "utf8").split("\n");
    for (let i = Math.max(0, line - 4); i < Math.min(lines.length, line + 2); i++) {
      const mark = (i + 1 === line) ? `${C.red}>>${C.off}` : "  ";
      console.log(`  ${mark} ${String(i + 1).padStart(4)} | ${lines[i]}`);
    }
  }
  console.log(`
  ${C.b}Almost always one of these three:${C.off}
    1. A missing comma between two entries in a list.
    2. An apostrophe inside single quotes:  'don't'  ends the text early.
       Use double quotes instead:  "don't"
    3. A missing closing bracket:  }  or  ]

  The line number is where Node NOTICED the problem, which is often a line
  or two AFTER the real mistake. Look just above it.

  To throw your changes away and start again:
    ${C.b}git checkout -- js/content.js${C.off}
`);
  process.exit(1);
}

if (!EDGE || typeof EDGE !== "object") {
  err("content.js parsed, but EDGE is not an object.");
  process.exit(1);
}
ok("content.js parses");

/* -- helpers -------------------------------------------------------------- */

const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
const filled = s => typeof s === "string" && s.trim().length > 0;
const PLACEHOLDER = /PLAYER-0\d|Full Name|xxxxxxxx|YOUR-PROJECT|example\.com/i;

/* -- 2. Club ------------------------------------------------------------- */

console.log(`\n${C.b}Club${C.off}`);
const club = EDGE.club || {};
if (!filled(club.name)) err("club.name is empty");
else ok(`name: ${club.name}`);

if (!filled(club.email)) warn("club.email is empty — the site has no contact route");
else if (PLACEHOLDER.test(club.email)) warn(`club.email looks like a placeholder: ${club.email}`);
else ok(`email: ${club.email}`);

["instagram", "discord", "youtube"].forEach(k => {
  const v = club[k];
  if (!filled(v)) warn(`club.${k} is empty — no ${k} link appears in the footer`);
  else if (!/^https?:\/\//.test(v)) err(`club.${k} must start with https:// — got "${v}"`);
  else ok(`${k}: ${v}`);
});

/* -- 3. Leaderboard ------------------------------------------------------- */

console.log(`\n${C.b}Leaderboard${C.off}`);
const board = (EDGE.players && EDGE.players.leaderboard) || [];
if (!Array.isArray(board) || board.length === 0) {
  warn("no leaderboard rows");
} else {
  ok(`${board.length} row${board.length === 1 ? "" : "s"}`);
  let placeholders = 0;
  board.forEach((r, i) => {
    const at = `leaderboard[${i}]`;
    if (!filled(r.ign))  err(`${at} has no ign (the tag shown in the table)`);
    if (!filled(r.game)) err(`${at} (${r.ign || "?"}) has no game`);
    ["points", "w", "l", "move"].forEach(k => {
      if (r[k] !== undefined && typeof r[k] !== "number")
        err(`${at} (${r.ign || "?"}) .${k} must be a number, not text — got ${JSON.stringify(r[k])}`);
    });
    if (PLACEHOLDER.test(`${r.ign} ${r.name}`)) placeholders++;
  });
  if (placeholders) warn(`${placeholders} row(s) still contain placeholder names`,
                         "these are visible to anyone who opens the Players tab");
}

/* -- 4. Rosters ----------------------------------------------------------- */

console.log(`\n${C.b}Rosters${C.off}`);
const rosters = (EDGE.players && EDGE.players.rosters) || [];
if (!rosters.length) warn("no rosters");
rosters.forEach((t, i) => {
  const at = `rosters[${i}]`;
  if (!filled(t.game)) err(`${at} has no game`);
  if (!["active", "recruiting"].includes(t.status))
    err(`${at} (${t.game || "?"}) status must be "active" or "recruiting" — got ${JSON.stringify(t.status)}`);
  const n = (t.players || []).length;
  if (t.status === "active" && n === 0)
    warn(`${at} (${t.game}) is "active" but has no players`,
         'use status: "recruiting" to show a tryout call instead');
  const ph = (t.players || []).filter(p => PLACEHOLDER.test(`${p.ign} ${p.name}`)).length;
  if (ph) warn(`${t.game}: ${ph} placeholder player(s)`);
  else if (n) ok(`${t.game}: ${n} player${n === 1 ? "" : "s"} (${t.status})`);
});

/* -- 5. Updates ----------------------------------------------------------- */

console.log(`\n${C.b}Updates${C.off}`);
const updates = EDGE.updates || [];
if (!updates.length) warn("no updates");
else ok(`${updates.length} entries`);
const KINDS = ["deadline", "event", "announcement", "result"];
const today = new Date(); today.setHours(0, 0, 0, 0);
let upcoming = 0;
updates.forEach((u, i) => {
  const at = `updates[${i}]`;
  if (!filled(u.title)) err(`${at} has no title`);
  if (!KINDS.includes(u.kind))
    err(`${at} ("${u.title}") kind must be one of ${KINDS.join(", ")} — got ${JSON.stringify(u.kind)}`);
  if (!isDate(u.date))
    err(`${at} ("${u.title}") date must look like 2026-10-12 — got ${JSON.stringify(u.date)}`);
  else {
    const [y, m, d] = u.date.split("-").map(Number);
    const when = new Date(y, m - 1, d);
    if (isNaN(when)) err(`${at} ("${u.title}") date is not a real date: ${u.date}`);
    else if (when >= today) upcoming++;
  }
  if (u.time && !/^\d{2}:\d{2}$/.test(u.time))
    err(`${at} ("${u.title}") time must look like 23:59 — got ${JSON.stringify(u.time)}`);
});
if (updates.length && upcoming === 0)
  warn("every update is in the past — the countdown will not show");
else if (upcoming) ok(`${upcoming} upcoming — the countdown has something to target`);

/* -- 6. Blog -------------------------------------------------------------- */

console.log(`\n${C.b}Blog${C.off}`);
const blog = EDGE.blog || [];
let shown = 0;
blog.forEach((p, i) => {
  const at = `blog[${i}]`;
  if (p.type === "instagram") {
    if (!filled(p.url)) warn(`${at} is an Instagram card with no url — it is skipped silently`);
    else if (!/^https?:\/\//.test(p.url)) err(`${at} url must start with https://`);
    else shown++;
    return;
  }
  shown++;
  if (!filled(p.title)) err(`${at} has no title`);
  if (p.date && !isDate(p.date))
    err(`${at} ("${p.title}") date must look like 2026-10-12 — got ${JSON.stringify(p.date)}`);
  if (filled(p.media)) {
    const abs = path.join(ROOT, p.media);
    if (!fs.existsSync(abs)) err(`${at} ("${p.title}") media file does not exist: ${p.media}`,
                                 "the card will show a broken image");
    else {
      const kb = Math.round(fs.statSync(abs).size / 1024);
      if (kb > 600) warn(`${at} ("${p.title}") ${p.media} is ${kb} KB`,
                         "resize to about 1600px wide and re-save — big images make the page slow on phones");
      else ok(`${p.title}: ${p.media} (${kb} KB)`);
    }
    if (!filled(p.alt)) warn(`${at} ("${p.title}") has no alt text`,
                             "screen readers will skip the image entirely");
  }
});
if (!shown) warn("no blog posts will render");

/* -- 7. FAQ --------------------------------------------------------------- */

console.log(`\n${C.b}FAQ${C.off}`);
const faq = EDGE.faq || {};
const entries = faq.entries || [];
if (!entries.length) err("faq.entries is empty — the chatbot has nothing to say");
else ok(`${entries.length} questions`);
if (!filled(faq.greeting)) err("faq.greeting is empty");
if (!filled(faq.fallback)) err("faq.fallback is empty — the bot cannot say 'I do not know'");
const seenKeywords = new Map();
entries.forEach((e, i) => {
  const at = `faq.entries[${i}]`;
  if (!filled(e.q)) err(`${at} has no question`);
  if (!filled(e.a)) err(`${at} ("${e.q}") has no answer`);
  const kws = e.keywords || [];
  if (kws.length < 3)
    warn(`${at} ("${e.q}") has only ${kws.length} keyword(s)`,
         "the bot will rarely match it — add the words people actually type");
  kws.forEach(k => {
    if (!seenKeywords.has(k)) seenKeywords.set(k, []);
    seenKeywords.get(k).push(e.q);
  });
});
const clashes = [...seenKeywords.entries()].filter(([, qs]) => qs.length >= 3);
if (clashes.length)
  warn(`${clashes.length} keyword(s) appear on 3+ questions: ${clashes.slice(0, 5).map(c => c[0]).join(", ")}`,
       "generic keywords make one answer swallow unrelated questions");

/* -- 8. Join / backend ---------------------------------------------------- */

console.log(`\n${C.b}Join form${C.off}`);
const J = EDGE.join || {};
if (!(J.branches || []).length) err("join.branches is empty — the branch dropdown will be blank");
else ok(`${J.branches.length} branches`);
if (!(J.titles || []).length) warn("join.titles is empty — the Roster path has no games to pick");
if (!(J.years || []).length) err("join.years is empty");

const be = (J.backend || {});
const sb = be.supabase || {};
if (be.mode === "demo") {
  warn('backend.mode is "demo" — submissions are logged to the console and thrown away');
} else if (!filled(sb.url) || !filled(sb.anon_key)) {
  err("Supabase is not configured — every registration is stranded in the visitor's own browser",
      "paste the project url and anon key into join.backend.supabase");
} else if (PLACEHOLDER.test(sb.url)) {
  err(`backend.supabase.url is still a placeholder: ${sb.url}`);
} else if (/service_role/.test(sb.anon_key) ||
           /"role"\s*:\s*"service_role"/.test(Buffer.from((sb.anon_key.split(".")[1] || ""), "base64").toString("utf8"))) {
  err("THAT IS THE SERVICE ROLE KEY. Remove it immediately and rotate it in Supabase.",
      "it bypasses all security and is published in your page source");
} else {
  ok(`Supabase configured: ${sb.url}`);
  console.log(`         ${C.dim}run  bash scripts/verify-supabase.sh  to check it is secure${C.off}`);
}

/* -- verdict -------------------------------------------------------------- */

console.log(`\n${C.dim}────────────────────────────────────────────────────────${C.off}`);
if (errors === 0 && warnings === 0) {
  console.log(`  ${C.grn}${C.b}All clear.${C.off} Safe to commit.\n`);
} else if (errors === 0) {
  console.log(`  ${C.grn}No errors${C.off}, ${C.yel}${warnings} warning(s)${C.off}.`);
  console.log(`  ${C.dim}Warnings will not break the site. Fix them when you can.${C.off}\n`);
} else {
  console.log(`  ${C.red}${C.b}${errors} error(s)${C.off}, ${warnings} warning(s).`);
  console.log(`  ${C.dim}Fix the errors before you commit.${C.off}\n`);
}
process.exit(errors === 0 ? 0 : 1);
