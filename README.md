# EDGE — club website

Four tabs — **About, Players, Updates, Join** — plus an **Ask EDGE** panel that
opens from the bottom-right corner.

Plain HTML, CSS and JavaScript. No build step, no framework, no install.
Double-click `index.html` and it runs.

Live: <https://edge-ruas.netlify.app>

---

## 1. Files

```
EDGE-Website/
├── index.html              the page shell and all four tabs
├── css/styles.css          design system — tokens are the first block
├── js/
│   ├── content.js          ← THE FILE YOU EDIT
│   ├── app.js              tab routing, About, blog, Players, Updates, Ask drawer
│   ├── join.js             the Join form and Supabase submission
│   └── faq-bot.js          the Ask assistant
├── assets/edge-mark.svg    the club logo, traced to vector
├── PRODUCT.md              who the site is for and what must stay true
├── DESIGN.md               the visual world and what it deliberately refuses
├── supabase-schema.sql     database setup
├── serve.js                optional local server
└── _archive-v1/            an earlier version, kept for reference only
```

### The one rule

**To change the site, edit `js/content.js` and refresh the browser.**

Posts, the About copy, rosters, the leaderboard, events, FAQ answers, branch
lists and every piece of wording come from that one file. You never open
`index.html` to change a player's name.

---

## 2. Running it

Double-click `index.html`. That is genuinely it — the site uses ordinary
scripts, not ES modules, specifically so that works.

If you want a local server (you will need one once Instagram embeds are in,
since their script does not always run over `file://`):

```bash
node serve.js
```

Then open <http://localhost:8790>.

---

## 3. The sections

### About — the first tab

The club's account of itself, then the evidence for it. `about.lead` is the
one-line statement, `about.body` the paragraphs, `about.facts` the lettered
list, `about.pillars` what the club does. `about.crew` lists the committee and
the whole block hides itself while that list is empty.

**The blog feed lives at the bottom of this tab**, not in a tab of its own.
Two kinds of post share the feed, sorted newest-first:

**Your own uploads.** Put the file in `assets/blog/` and add:

```js
{
  type:  "post",
  title: "Freshers Showdown - finals night",
  date:  "2026-09-05",
  tag:   "Events",
  media: "assets/blog/finals.jpg",     // .jpg .png .webp .mp4 all work
  alt:   "Finals night",
  body:  "Sixty-four players, three titles, one long night.",
  credit: "Photo by ..."               // optional
}
```

Leave `media` empty and the slot is painted as a plain board reading ADD MEDIA,
so an unfinished post is obvious without pretending to be a photograph.

The newest post runs full-width as the lead; the rest sit smaller beneath it.

**Instagram posts.** Paste the post URL, nothing else:

```js
{ type: "instagram", url: "https://www.instagram.com/p/ABC123/", tag: "Instagram" }
```

No Meta developer account, no token, no expiry. Instagram renders it from the
link alone. An entry with an empty `url` is skipped silently.

Filter chips build themselves from whatever `tag` values you use.

### Players

**Leaderboard** sorts itself by points — you do not maintain the rank column.
`move` is the change in position since the last update.

**Official Roster** lists teams. A team with `status: "recruiting"` and empty
`players: []` shows a "tryouts open" card linking to Join.

### Updates

Future dates are automatically "upcoming"; past ones drop into an archive
below. **You never sort this list yourself.** `pinned: true` locks something to
the top. A countdown to the next event sits above the list, and the Updates tab
grows a dot when something falls within seven days.

### Join

One form, two paths. **Member** asks the basics; **Roster** adds the
competitive questions. Required fields change with the path, and switching
paths clears errors belonging to the path you left, so a hidden field can never
block you with a message you cannot see.

Phone numbers are accepted however people type them (`+91 98765 43210`,
`09876543210`) and stored as ten bare digits. Emails are lowercased and
register numbers uppercased, so you never get three spellings of one student.

### Ask EDGE — the drawer

The FAQ is not a tab. A launcher pinned bottom-right opens a panel down the
right-hand side, so a question can be asked from whatever section is being
read. It closes on the button, the backdrop, or Escape.

**It is not an AI model, deliberately.** A real model needs an API key, and a
key shipped in a public page can be read by anyone who views source and used to
run up your bill. Instead it matches what someone types against the `keywords`
on each answer in `content.js`. It costs nothing, works offline, and can only
ever say words you wrote.

To make it smarter, add words to an entry's `keywords` — especially the slang
and misspellings people actually type. The matcher lowercases, strips
punctuation, drops filler words and does light stemming. When it is not
confident it says so and offers the closest questions rather than guessing.

---

## 4. Turning the Join form on

The form works but stores nothing until Supabase is configured. Submissions are
held in the browser and sent automatically once the keys are in, so nothing is
lost meanwhile.

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → New query → paste all of `supabase-schema.sql` → Run.
3. Project Settings → API → copy the **Project URL** and the **anon public** key.
4. Paste both into `js/content.js` under `join.backend.supabase`.
5. Run the two `curl` commands at the bottom of the SQL file to verify.

### Security — read this before going live

You are collecting names, phone numbers, emails and register numbers of
students.

Supabase publishes every table over a public REST API, and the anon key in
`content.js` is visible to anyone who views source. **That key is meant to be
public. Row Level Security is what actually protects the data.**

The SQL grants exactly one permission: the public may INSERT. It creates no
select, update or delete policy, so nobody can read, edit or wipe your
registrations through the public API. You read them signed in to the dashboard.

Skip that step and anyone who views source can download every student's
personal details. The second `curl` command verifies it: **it must return an
empty list.**

---

## 5. Changing the look

`DESIGN.md` records the visual world and what it deliberately refuses. Read it
before changing anything structural.

Every colour is a token at the top of `css/styles.css`:

```css
--board       #101012   /* the page ground */
--board-deep  #17171A   /* recessed panels, inputs */
--board-alt   #202025   /* the second board */
--white       #F5F5F3   /* lettering */
--grey        #A6A6A3   /* secondary text */
--signal      #FFFFFF   /* PRIMARY ACTION ONLY */
```

Black and white, because the club mark is. A solid white fill means primary
action and nothing else.

The surfaces are a ladder on purpose: on pure black a shadow is invisible, so
depth has to come from the surface value itself or every panel reads as one
flat plane. That is also why the ground is `#101012` rather than `#000`.

Type is **Chakra Petch** for display, matching the EDG3 wordmark, and
**Archivo** for body.

---

## 6. Checking your work

The project has the `impeccable` design linter installed. After any UI change:

```bash
.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe detect index.html css/styles.css js/*.js
```

No output means clean. It catches contrast failures, undersized text, thick
one-sided borders and animated layout properties.

---

## 7. Deploying

Deploys go to Netlify. **Always publish a clean tree, never the working
folder** — the CLI's `--dir` ignores `.gitignore`, and publishing the folder
directly once put files online that should never have been there:

```bash
git archive --format=tar HEAD | tar -x -C /tmp/publish
npx netlify-cli deploy --prod --dir=/tmp/publish
```

Better still, link the GitHub repo in the Netlify dashboard. Git-sourced builds
can only publish committed files, which makes that mistake impossible.

Repo: <https://github.com/potatoesareathing/edge-website>

---

## 8. What still needs doing

- Real photos in `assets/blog/`, and real roster names in `content.js`
- The Supabase keys, so registrations actually save
- Confirm the founding year and the branch list against RUAS's own wording
- Add the committee to `about.crew`
