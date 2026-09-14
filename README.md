# EDGE — club website

Five sections: **Blog, Join, FAQ, Players, Updates.**

Plain HTML, CSS and JavaScript. No build step, no framework, no install.
Double-click `index.html` and it runs.

---

## 1. Files

```
EDGE-Website/
├── index.html              the page shell and all five tabs
├── css/styles.css          design system - brand tokens are the first block
├── js/
│   ├── content.js          ← THE FILE YOU EDIT
│   ├── app.js              tab routing, Blog, Players, Updates
│   ├── join.js             the Join form and Supabase submission
│   └── faq-bot.js          the FAQ assistant
├── assets/
│   ├── edge-mark.svg       the club logo, traced to vector
│   ├── frames/             96 WebP stills (kept from the previous build)
│   └── jinn_punch.original.mp4
├── supabase-schema.sql     database setup
├── serve.js                optional local server
└── _archive-v1/            the previous version of the site, kept for reference
```

### The one rule

**To change the site, edit `js/content.js` and refresh the browser.**

Posts, rosters, the leaderboard, events, FAQ answers, branch lists and every
piece of copy come from that one file. You never open `index.html` to change a
player's name.

---

## 2. Running it

Double-click `index.html`. That is genuinely it.

The previous build used ES modules, which browsers refuse to load over
`file://` — so it needed a server just to look at it. This one uses ordinary
scripts specifically so that double-clicking works.

If you want a local server anyway (you will need one when the Instagram embeds
are in, since Instagram's script does not always run over `file://`):

```bash
node serve.js
```

Then open <http://localhost:8790>.

---

## 3. The five sections

### Blog

Two kinds of post live in the same feed, mixed together and sorted newest-first:

**Your own uploads.** Put the image or clip in `assets/blog/` and add:

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

Leave `media` empty and you get a striped "Add media" placeholder — deliberately
ugly, so an unfinished post is obvious.

**Instagram posts.** Paste the post URL, nothing else:

```js
{ type: "instagram", url: "https://www.instagram.com/p/ABC123/", tag: "Instagram" }
```

No Meta developer account, no access token, no expiry to manage. Instagram
renders it from the link alone. An entry with an empty `url` is skipped
silently, so the placeholder in the file costs you nothing.

The filter chips build themselves from whatever `tag` values you use.

### Join

One form, two paths. **Member** asks the basics. **Roster** asks those plus the
competitive questions — title, in-game name, rank, role, experience.

Which fields are required changes with the path, and switching paths clears any
error belonging to the path you left, so a hidden field can never block you with
a message you cannot see.

Phone numbers are accepted however people actually type them
(`+91 98765 43210`, `09876543210`) and stored as ten bare digits. Emails are
lowercased and register numbers uppercased, so you do not end up with three
spellings of the same student.

### FAQ

A chat assistant plus the full list of questions underneath.

**It is not an AI model, and that is on purpose.** A real language model needs
an API key, and a key shipped inside a public web page can be read by anyone who
views source and used to run up your bill. Instead it matches what someone types
against the keywords on each answer in `content.js`. It costs nothing, works
offline, never invents an answer, and only ever says words you wrote.

To make it smarter, add words to an entry's `keywords` — especially the slang
and misspellings people actually type. The matcher lowercases, strips
punctuation, removes filler words, and does light stemming so "years" matches
"year" and "casting" matches "cast".

If it is not confident, it says so and offers the closest questions rather than
guessing. Everything is also rendered as a plain list below the chat, so nobody
is ever stuck.

*If you later want a real AI:* host on Netlify or Vercel, put the Anthropic API
key in a serverless function's environment variables (never in `content.js`),
and have the page call your function instead of the API directly. Keep this
matcher as the fallback for when the network is down.

### Players

Two views. **Leaderboard** sorts itself by points — you do not maintain the rank
column, just the numbers. `move` is the change in position since the last
update: positive climbs, negative drops, `0` stays.

**Official Roster** lists teams. A team with `status: "recruiting"` and an empty
`players: []` shows a "tryouts open" card linking to Join, instead of an empty
grid.

### Updates

Anything dated in the future is automatically "upcoming"; past dates drop into
an "Earlier" archive underneath. **You never sort this list yourself.**
`pinned: true` locks something to the top.

A live countdown to the next event sits above the list, and the Updates tab
grows a dot when something is happening within seven days.

---

## 4. Turning the Join form on

Right now the form works fully but stores nothing, because Supabase needs two
values only you can generate. Until they are filled in, submissions are held in
the browser and sent automatically the moment you add the keys — nothing is lost
in the meantime.

1. Create a free project at [supabase.com](https://supabase.com).
2. SQL Editor → New query → paste all of `supabase-schema.sql` → Run.
3. Project Settings → API → copy the **Project URL** and the **anon public** key.
4. Paste both into `js/content.js` under `join.backend.supabase`.
5. Run the two `curl` commands at the bottom of the SQL file to verify.

### Security — please read this before going live

You are collecting names, phone numbers, emails and register numbers of
students.

Supabase publishes every table over a public REST API, and the anon key in
`content.js` is visible to anyone who views the page source. **That key is meant
to be public. Row Level Security is what actually protects the data.**

The SQL file grants exactly one permission: the public may INSERT. It
deliberately creates no select, update or delete policy, so nobody can read,
edit or wipe your registrations through the public API. You read them while
signed in to the Supabase dashboard.

Skip that step and anyone who views source can download every student's personal
details. The second `curl` command verifies it: **it must return an empty list.**

---

## 5. Changing the look

Every colour is a token at the top of `css/styles.css`:

```css
--accent:     #C8FF00;   /* the lime. Change this one line to reskin. */
--bg:         #060607;
--surface-1:  #0C0C0E;   /* each step is lighter than the one below, */
--surface-2:  #131317;   /* so panels can actually sit on each other */
--surface-3:  #1B1B21;
```

The surfaces are a ladder on purpose. On pure black a shadow is invisible, so
depth has to come from the surface value itself — otherwise every panel reads as
one flat plane.

Type is Chakra Petch for display and Inter for body, loaded from Google Fonts.

---

## 6. Deploying

Any static host works. There is no server-side code.

- **Netlify** — drag the folder onto app.netlify.com. Live in ten seconds.
- **GitHub Pages** — push, then Settings → Pages → deploy from `main`.
- **Vercel** — `vercel deploy` from inside the folder.

---

## 7. Still to fill in

Search the project for `TODO` — each one is a real blank.

- Instagram, Discord and YouTube links, and the contact email
- Real blog posts and their images
- The leaderboard numbers, and real player names on every roster
- Event dates and venues
- The branch list, corrected to the exact names RUAS uses
- The register-number pattern in `js/join.js`, once you confirm the format
  (currently permissive: 4–20 letters and digits)

---

## 8. Where this goes next

The `registrations` table is the spine. Column names are generic on purpose so
that rankings, teams and tournaments can all reference it later rather than
starting over.

1. Point the leaderboard and rosters at the database instead of `content.js`,
   so the site updates itself when an event ends.
2. Player cards generated on registration, shareable to Instagram stories.
3. A live leaderboard screen for events, driven off the same table.
