# Design

Written from the built site, not before it. Product truth lives in `PRODUCT.md`;
this file records the visual world only.

## The world

**Sign painting in EDGE's own black and white.** A hand-painted signboard:
painted boards, cream-white lettering, heavy ruled borders, one reserved
primary action.

The world was rolled as enamel sign painting in saturated colour. The club's
mark is pure black and white, and a brand commitment beats the roll, so the
structure was kept and the material translated: the boards, rules, plates and
refusals are unchanged, the enamel colour is gone. Emphasis now comes from
weight, scale and contrast, which is what a monochrome identity demands.

The category default for a college esports site is near-black with a neon accent
and glowing angular panels. That look says nothing about EDGE and every AI-built
gaming site ships it. A student at RUAS walks past dozens of hand-painted shop
boards a day — this surface belongs to their street rather than to a template.

Dark or light was decided from the use scene, not the category: the site is read
outdoors on a phone in Bengaluru daylight, where a dark ground with bright
lettering is what real signage uses to stay legible in glare.

## Tokens

```
--board        #101012   the page ground
--board-deep   #17171A   recessed boards, inputs, panels
--board-alt    #202025   the second board, for separation
--board-ink    #08080A   top rail, footer, field interiors

--white        #F5F5F3   lettering
--grey         #A6A6A3   secondary text
--grey-dim     #6E6E72   tertiary

--signal       #FFFFFF   PRIMARY ACTION ONLY
--signal-ink   #08080A   lettering drawn on the signal fill
```

Colour strategy is **Restrained by identity**: the mark is monochrome, so the
site is. Not pure black — on `#000` a shadow is invisible and every panel
flattens to one plane, so the ladder starts just above it.

A solid white fill is a law, not a palette entry: it means primary action and
nothing else. If a white fill appears on something that is not the primary
action, that is a bug.

## Type

- **Display — Chakra Petch.** Chosen to match the EDG3 wordmark's angular
  cuts and squared counters, and already EDGE's face from the broadcast
  overlay pack, so the site and the stream agree. Headings, labels, buttons,
  table headers.
- **Body — Archivo.** A plain grotesque. A signwriter letters the headline and
  stencils the small print; the body face does not compete.

`.painted` applies the hard 3px offset shadow a signwriter cuts by hand. Never
blurred — a soft shadow is a different craft.

Section titles run to 5rem. Size is billing: the largest thing on a screen is
what the screen is about.

## Components

The mark and the logotype are vector-traced from the club's original artwork
in `edge_requirements/`, not approximations. The ghost is **398x333** and the
logotype **665x183** — neither is square. Every use sets height and lets width
follow.

Do not add a blanket `img[src*="edge-mark.svg"]` rule to enforce that: an
attribute selector outranks a class, so it overrode each component's own
height and collapsed the marks to nothing, then to full natural size.

The mark carries an explicit `fill`, not
`currentColor`: an SVG loaded through `<img>` is its own document and cannot
inherit the page's colour, so `currentColor` renders it black.

**The board** (`.board`) replaces cards everywhere. A 3px outer rule with a thin
inner rule set in from it, the way a board is framed before it is lettered.
Depth comes from overlap and border weight — there are no soft shadows, no
glass, no glow anywhere in this system.

**Plates** (`.plate`) are the buttons. They translate 1px on press, like
something physical. `.plate--primary` is the only solid white fill on the page.

**Rules** (`.rule`) are the double line drawn under a heading.

## Structure

Four tabs: **About**, Players, Updates, Join. About leads and carries both the
club's account of itself and the blog feed beneath it — the claim, then the
evidence for it.

The FAQ is not a tab. It is a launcher pinned bottom-right (`--fab-bottom`,
set clear of any host badge) opening a panel down the right-hand side, so a
question can be asked from whatever section is being read. It closes on the
button, the scrim, or Escape, and returns focus to the launcher.

The drawer is unhidden and then opened after a forced layout read
(`void drawer.offsetWidth`), never inside `requestAnimationFrame`. rAF does not
reliably fire in a backgrounded or throttled renderer, and when it did not the
panel sat parked off-screen while still being focusable.

## The homeworld

About opens on a full-viewport looping film — the club mascot, wearing the
helmet the mark is drawn from. It is fixed behind the page, so scrolling lifts
the content up over it rather than scrolling the film away.

**The film is the only colour on the site.** Its yellow is left alone; the
interface stays monochrome. Footage carries colour, chrome does not — which is
how the palette rule survives a colour asset without either being weakened.

Three rules govern playback, all about not wasting a student's data:

1. The `src` is attached in JS, never in markup. On a metered connection, or
   under reduced motion, the file is never fetched and the poster frame stands
   in.
2. It only runs on About. Every other tab hides and pauses it.
3. It pauses when the document is hidden and when the first viewport is
   scrolled past.

**The loop is crossfaded.** The 8s source cut hard at the join. The shipped
file is 7s: its first second is a blend of the source's tail fading into its
head, so the last frame and the first frame are one frame apart in the
original timeline. Measured, the junction differs by 6.6 RMS against 9.8 for
ordinary adjacent frames mid-clip — the loop point is a smaller step than
normal motion, so there is nothing to see. Audio was dropped (the film is
muted anyway) and the re-encode took it from 7.9 MB to 3.7 MB. The untouched
source is kept out of the repo at `assets/video/homeworld-source.mp4`.

A scrim sits over it: a fixed gradient anchored under the text column, because
moving footage changes contrast frame to frame and the hero copy needs
guaranteed ground. A second value (`--scrim`) rises with scroll so the film is
fully covered by the time the content surface reaches the top.

`.home-content` is opaque with a ruled top edge, so the page reads as a board
sliding up over the footage.

## Motion

The page still has one authored entrance: `@keyframes paint` wipes a section in
from the left as a brush lays a stroke. Nothing else animates on arrival.

On top of that sits a deliberate **interaction layer**, asked for by the brief.
It has one grammar, not scattered effects:

- **Glitch on hover.** Two offset copies of a string flash for ~0.26s and
  clear, clipped into upper and lower bands. `data-text` is written by
  `initGlitch()` from each element's own `textContent`, so the markup stays
  clean and content rendered from `content.js` is covered too. Applied to
  headings, section titles, path names, player tags and post titles.
- **Scroll reveal.** Content does not fade and rise, which is the generic
  move. It paints on with the same left-to-right wipe as the panel entrance,
  so arriving content uses the one gesture this world already owns. `.rise`
  hides its element until an observer says otherwise, so it carries a safety
  net: if nothing has revealed shortly after load, everything is shown. A
  reveal that can hide the page is worse than no reveal.
- **Enlargement on hover.** Chips, subtabs, paths, pillars, crew and roster
  cards lift and scale; post images scale inside their frame; tabs gain
  letter-spacing. A roster card raises its `z-index` so it lifts above its
  neighbours rather than being clipped by them.

Everything animates `transform` and `opacity` only. Animating `padding` or
`width` relayouts the element every frame — two of those shipped briefly and
the detector caught them.

The whole layer is disabled under `prefers-reduced-motion`, and the glitch
pseudo-elements are removed outright there so no text is ever doubled.

## Refused

Held out deliberately, and each one is a regression if it returns:

- Eyebrow or kicker labels above headings
- Section numbers (01 / 02 / 03)
- Uniform card grids as page structure
- Thick coloured one-sided borders — the most recognisable AI-UI tell
- Decorative grid-line backgrounds
- Gradient text, glass, glow, soft shadows
- Near-black ground with a neon accent
- Colour introduced anywhere the mark does not have it
- Animating layout properties (padding, width, height, margin)

## Empty states

A first-class surface here, not an afterthought. The site launches with almost
no real content, so `.empty` is lettered with a title and an explanation, and
an unfilled media slot is a plain board reading ADD MEDIA rather than a hatched
pattern imitating a photograph.

## Verification

`impeccable detect` runs clean on `index.html`, `css/styles.css` and all of
`js/`. The previous build returned 39 findings, including 22 labels below the
11px legibility floor and 8 contrast failures.

Re-run after any UI change:

```bash
.claude/skills/impeccable/scripts/bin/windows-x64/impeccable.exe detect index.html css/styles.css js/*.js
```
