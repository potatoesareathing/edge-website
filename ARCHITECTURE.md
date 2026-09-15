# Architecture

How the EDGE site is put together and why. `README.md` is the operating manual;
this is the map. `PRODUCT.md` holds product truth, `DESIGN.md` the visual world.

---

## 1. Shape of the thing

A single HTML page, four tab panels, one slide-in drawer. No build step, no
framework, no package manager, no server-side code.

```
browser
   │
   ├── index.html          empty labelled containers + the drawer
   ├── css/styles.css      one stylesheet, tokens first
   └── js/
        ├── content.js     DATA        — a single object literal, EDGE
        ├── app.js         RENDER      — routing, About/blog, Players, Updates, drawer
        ├── faq-bot.js     MATCH       — the Ask assistant
        └── join.js        SUBMIT      — form validation and Supabase
```

Scripts are plain `<script>` tags, not ES modules, and they run in order. That
is deliberate: modules are blocked over `file://`, so a module build cannot be
opened by double-clicking. Each file wraps itself in an IIFE, so nothing leaks
to `window` except `EDGE`.

### The three constraints everything follows from

1. **Maintained by people still learning.** No toolchain. Edit a file, refresh.
2. **Launches almost empty.** Every surface must look deliberate with no
   content in it. Empty states are designed, not afterthoughts.
3. **Read on a phone in bad campus wifi.** A dropped connection must not lose a
   registration.

---

## 2. Data flow

One direction, always:

```
js/content.js  ──►  renderers in app.js  ──►  DOM
   (the EDGE          read, build nodes       labelled containers
    object)           in memory               in index.html
```

`index.html` ships with empty containers — `#blogGrid`, `#aboutFacts`,
`#boardBody`, `#updatesList`. Renderers fill them. Nothing reads data back out
of the DOM, and no renderer mutates `EDGE`.

That separation is the whole point: a committee member changes a roster by
editing a list of names in `content.js` and never opens markup.

### Why `textContent`, never `innerHTML`

`el(tag, className, text)` in `app.js` is the only node factory, and it assigns
text with `textContent`. A `<` in a gamer tag renders as a character instead of
being parsed as markup. Since `content.js` is edited by hand by several people,
this is a correctness guarantee as much as a security one.

---

## 3. Boot sequence

`app.js` `init()` runs in a fixed order, and the order matters:

```
initTabs()        wire the router, resolve the opening tab from location.hash
initAsk()         wire the drawer launcher, close button, scrim, Escape
renderBlog()      ─┐
renderAbout()      │
renderLeaderboard()├─ build DOM from EDGE
renderRosters()    │
initPlayerViews()  │
renderUpdates()    │
renderFooter()    ─┘
initGlitch()      LAST — reads textContent out of nodes just created
```

`initGlitch()` must run last. It writes each element's own text into
`data-text` so CSS can draw two offset copies of it, which means the nodes have
to exist first. It ran third once, and everything rendered from `content.js`
silently missed the effect.

`faq-bot.js` and `join.js` boot themselves on `DOMContentLoaded` independently.

---

## 4. Tab router

Four tabs, held in one array:

```js
const TABS = ["about", "players", "updates", "join"];
```

`showTab(name, push)` toggles `aria-selected` on the buttons and `.is-active`
on the panels, then scrolls to top so a tall previous tab does not leave the
new one halfway down.

- The URL hash is the source of truth. `#players` deep-links.
- `history.replaceState`, not `pushState`: switching tabs should not fill the
  back button with steps inside one page.
- Arrow keys, Home and End move between tabs, which is what a screen reader
  expects from `role="tablist"`.
- An unknown hash falls back to `TABS[0]`.

Panels appear in the DOM in the same order as the tabs. Invisible while JS
toggles them, but it is the order keyboard and screen-reader users traverse.

---

## 5. Subsystems

### About (and the blog)

`renderAbout()` fills the lead, body paragraphs, facts list and pillars.
`about.crew` drives a committee grid that hides its whole block while the list
is empty, rather than showing an empty heading.

The blog feed sits at the bottom of the same panel. `renderBlog()` filters out
Instagram entries with no URL, sorts newest-first, builds the filter chips from
whatever `tag` values exist, and splits the result: newest post full-width as
the lead, remainder in the grid below. Scale carries billing.

Instagram embeds load `embed.js` lazily, once, only if a post with a URL is
actually visible.

### Players

`renderLeaderboard()` sorts by points and derives the rank column, so nobody
maintains rank by hand. `move` is the change in position since the last update.

`renderRosters()` renders a team with `status: "recruiting"` and empty
`players: []` as a tryouts-open card linking to Join, not as an empty grid.

### Updates

`renderUpdates()` splits on date: future entries are upcoming, past ones drop
into an archive below. `pinned: true` locks an entry to the top. The list sorts
itself; the source list order is irrelevant.

`renderCountdown()` runs a ticking clock to the next event.
`markUpdatesBadge()` adds a dot to the Updates tab when something falls within
seven days.

### Ask EDGE — the portal

The FAQ is a separate dimension, not a panel on this one. `js/portal.js` owns
the effect and is deliberately generic: `open({video, origin, volume, onEnter})`
works for any world, so Players, Updates and Join can reuse it by passing a
different video.

**Why it is cheap.** The canvas draws *only* the destination world and writes
alpha 0 everywhere outside the tear. The homepage is not captured, re-rendered
or duplicated — it is simply still there underneath, showing through the hole.
That keeps the whole effect to one fullscreen quad and one fragment shader.

Raw WebGL, not a 3D library: there is no scene, camera or geometry beyond two
triangles, and a scene graph would be several hundred kilobytes to do less.

The shader does the work at the rim — an fbm-driven irregular edge, a
refraction pull dragging the world toward the opening, chromatic aberration
split along the radius, and a thin light. All of it fades out as the tear
grows (`settle`), so the arrived world is a clean image, not a permanent
effect.

**Interaction.** Hover opens a small tear and starts the audio bleeding
through; staying ~850 ms, or clicking, commits. Leaving retracts it. A full
takeover on a stray mouse path would be hostile, so the invitation is immediate
but the commitment is deliberate.

**Handover is driven by real progress**, not a timer — `onEnter` fires when
progress passes 0.985. A fixed delay guessed at the easing and let the
interface fade up while the homepage was still visible behind a half-open
portal.

**The arrived world is plain DOM, not the canvas.** On entry the same video
element stops being an offscreen texture source and becomes the world's actual
backdrop (`.portal-src.is-world`). One element, so playback position and audio
carry through with nothing to synchronise — and the world is solid even if
WebGL stalls or was never available. Relying on the canvas alone meant any
failure in the effect left the chat floating over the homepage.

**Leaving the button never ejects you.** `abort()` only retracts a peek. Once
the portal has committed, `pointerleave` does nothing: closing from there tore
down the portal while leaving the interface stranded on top of the homepage.
Exiting is `exit()`'s job, and it hides both.

**The tear waits for a decodable frame.** Over a network the file is still
buffering when the pointer arrives, and growing the portal onto an empty
texture is what made the transition look like nothing happened.

**But progress depends on rAF**, which does not run in a throttled or
backgrounded renderer. A 2.6 s stall guard forces the handover if the loop
never gets there; without it a stalled transition strands the visitor in a
half-open portal with audio playing, no interface and no way back. `exit()`
likewise closes the portal even when the interface never appeared.

### Portal audio

The destination video carries its own sound. It is ramped, never snapped:
0 → 0.4 over ~900 ms on entry, back to 0 over ~420 ms on exit, then muted.

The ramp runs on a 40 ms interval rather than rAF, because the ramp decides
whether sound is audible at all and rAF is not dependable — the same trap as
above. 40 ms steps are inaudible.

Autoplay policy is respected: a flag arms on the first real user gesture
(`pointerdown`, `pointerup`, `click`, `keydown`, `touchstart`). Until then the
portal opens in silence rather than throwing. `click` had to be in that list —
without it, clicking straight through left the guard unarmed and the element
sat at its default volume of 1.

---

## 6. The Ask assistant

Keyword matching, not a language model. A real model needs an API key, and a
key shipped in a public page can be read from source and used to run up a bill.
This costs nothing, works offline, and can only say words someone wrote.

Pipeline: `tokenize` → strip filler → `stem` → `score` each entry → compare
against a confidence bar.

`score(entry, words, raw)`:

| Signal | Points |
|---|---|
| Word matches a `keyword` | +2 |
| Word appears in the entry's question | +1 |
| Typed text nearly is the question | +3 |

Then divided by **`sqrt(wordCount)`**, not the count itself. Dividing by the
full count punished natural phrasing far too hard — "i want to sign up" scored
below a bare "join" because three of its words carried no signal. The square
root still stops a rambling question beating a short precise one, but gently.

Below `CONFIDENCE_BAR` (1.4) it declines and offers the nearest questions rather
than guessing. Every answer is also rendered as a plain list under the chat, so
a failed match is never a dead end.

To improve it, add words to an entry's `keywords` — especially slang and
likely misspellings.

---

## 7. Join form

### Path switching

One form, two paths. `setPath()` swaps which fields are required and clears
errors belonging to the path being left, so a hidden field can never block
submission with a message nobody can see. `ROSTER_ONLY` names the fields that
only apply to the competitive path.

### Normalisation

Applied at `collect()` so the database never sees three spellings of one
student:

- Phone → ten bare digits (`+91 98765 43210` and `09876543210` both accepted)
- Email → lowercased
- Register number → uppercased

### Submission

```
submit
  ├── validateAll()        fails → inline errors, stop
  ├── honeypot filled?     → silently pretend success (a bot)
  └── send(row)
        ├── mode "supabase" → POST to the REST API
        │     ├── 409         → "you have already signed up"
        │     ├── no keys yet → queue, tell the user it is saved
        │     └── other error → queue
        └── mode "demo"      → console.log, store nothing
```

### Offline queue

Anything that fails goes to `localStorage` under `edge_join_queue` and is
retried on next load and on `online`. On bad campus wifi this is the difference
between collecting 200 registrations and 130.

`flush()` skips retrying while Supabase is unconfigured, so entries collected
before the keys exist are held rather than burned.

### Security boundary

The Supabase anon key lives in `content.js` and is visible in page source.
**That is by design — Row Level Security is what protects the data, not the
key.** `supabase-schema.sql` grants exactly one permission: public INSERT. No
select, update or delete policy exists, so nobody can read, edit or wipe
registrations through the public API.

The database re-checks phone and email shape in constraints, because the
browser is not a trust boundary — anyone can POST straight at the API.

---

## 7b. Homeworld video

`initHomeworld()` owns the looping film on About.

- `src` is attached in JS, so a metered connection or reduced-motion
  preference never triggers the download. The poster covers that case.
- Plays only on About; `showTab()` calls `window.__edgeHomeworld(tab)`.
- Pauses when the document is hidden and when the first viewport is scrolled
  past. A loop nobody can see is pure cost.
- The scroll handler is **synchronous inside the passive listener**, not in
  `requestAnimationFrame`. Reading `scrollY` forces no layout and setting a
  custom property is cheap, so the throttle bought nothing while making
  correctness depend on rAF firing — the same trap that stranded the drawer.

The shipped `homeworld.mp4` is a crossfaded 7s loop cut from an 8s source, so
the join is continuous. Re-cut it with the recipe in `DESIGN.md` if the source
is ever replaced.

## 8. Style layer

One stylesheet. Tokens first, so the palette is one block at the top.

- Surfaces are an elevation **ladder** (`#101012` → `#17171A` → `#202025`).
  On pure black a shadow is invisible and every panel flattens to one plane.
- `--signal` (solid white) means primary action and nothing else.
- `.board` is the structural primitive and replaces cards everywhere.
- Browser surfaces — selection, caret, scrollbars, focus rings — are themed
  from the palette rather than left at browser defaults.

`DESIGN.md` lists what the system deliberately refuses and why.

### Interaction layer

- **Glitch:** `.glitch::before/::after` draw `attr(data-text)` as two offset
  copies, clipped into upper and lower bands, flashed for ~0.26s. Applied via
  JS so markup stays clean. Not applied to tabs or `<summary>`, which already
  use those pseudo-elements.
- **Enlargement:** chips, paths, pillars, crew, roster cards and post images.
  Roster cards raise `z-index` so they lift above neighbours rather than being
  clipped.

Everything animates `transform` and `opacity` only. Animating `padding` or
`width` relayouts every frame. The whole layer is disabled under
`prefers-reduced-motion`, and the glitch pseudo-elements are removed there so
text is never doubled.

---

## 9. Quality gate

The `impeccable` design linter is installed in `.claude/skills/`. It runs 61
deterministic rules — contrast, text size, AI-UI tells, layout-animation.

```bash
.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe detect index.html css/styles.css js/*.js
```

No output means clean. The current build is clean; the build before this
system was installed returned 39 findings.

---

## 10. Deployment

```
working folder ──► git (IP gitignored) ──► git archive ──► clean tree ──► netlify
```

**Never deploy the working folder.** `netlify deploy --dir=.` uploads
everything and ignores `.gitignore`. Doing that once published 96 frames of
third-party game IP to the public site. They were removed and the bad deploy
deleted, since Netlify keeps old deploys alive at permanent URLs.

```bash
git archive --format=tar HEAD | tar -x -C /tmp/publish
npx netlify-cli deploy --prod --dir=/tmp/publish
```

Linking the GitHub repo in the Netlify dashboard is better still: git-sourced
builds can only publish committed files, which makes the mistake structurally
impossible.

---

## 11. Invariants

Things that must stay true. Breaking one is a regression, not a change.

1. `content.js` is the only file a non-developer edits.
2. No build step. The site opens by double-clicking `index.html`.
3. Text into the DOM goes through `textContent`, never `innerHTML`.
4. `initGlitch()` runs after every renderer.
5. Panel DOM order matches tab order.
6. A solid white fill means primary action and nothing else.
7. Only `transform` and `opacity` are animated.
8. No select/update/delete policy on the registrations table.
9. No third-party game characters, official art or fan art. Original work only.
10. Deploys publish a clean tree, never the working folder.
11. Asset URLs are versioned (`?v=n`) when the file changes, and `/assets/*`
    revalidates. A 24-hour cache header meant a corrected logo kept serving
    the old file for a day, so the fix looked like it had not worked.
12. Logo images set height only. A blanket attribute-selector rule outranks
    every component class and breaks them all.
13. `position` is never re-declared on `.ask-fab`, `.ask` or `.ask-scrim` by a
    later rule. They are `position: fixed`; a later same-specificity rule
    setting `relative` silently drops the launcher into normal flow.

---

## 12. Where it goes next

- Rosters and leaderboard read from Supabase instead of `content.js`, so the
  site updates itself when a tournament ends.
- Player profile pages, once registrations are real.
- The broadcast overlay pack sharing these tokens, so the stream and the site
  are visibly one organisation.
