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

The mark at `assets/edge-mark.svg` carries an explicit `fill`, not
`currentColor`: an SVG loaded through `<img>` is its own document and cannot
inherit the page's colour, so `currentColor` renders it black.

**The board** (`.board`) replaces cards everywhere. A 3px outer rule with a thin
inner rule set in from it, the way a board is framed before it is lettered.
Depth comes from overlap and border weight — there are no soft shadows, no
glass, no glow anywhere in this system.

**Plates** (`.plate`) are the buttons. They translate 1px on press, like
something physical. `.plate--primary` is the only solid white fill on the page.

**Rules** (`.rule`) are the double line drawn under a heading.

## Motion

One authored moment: `@keyframes paint` wipes a section in from the left as a
brush lays a stroke. Nothing else on the page animates in. Hover states are
colour and 1px position shifts only.

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
