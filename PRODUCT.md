# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Students at Ramaiah University of Applied Sciences. The primary visitor is a
student who has heard of EDGE and is deciding whether to join — most often a
first-year, early in the academic year, on a phone, having seen the club at a
stall or in someone's story. Their job is to work out what EDGE actually is,
whether they are good enough or welcome, and what the next step is.

A second audience is existing members checking dates, results and standings.
A third, smaller but commercially important, is a prospective sponsor or a
university staff member judging whether the club is credible.

*(INFERRED from the brief and project history — not yet confirmed by the club.)*

## Product Purpose

The public face of the club. It exists to convert interest into registrations
and to make EDGE legible to people who are not already in the Discord. Success
is a student who arrives curious and leaves registered, and a club that no
longer has to explain itself one conversation at a time.

## Positioning

EDGE is run by students but deliberately operates like a real esports
organisation rather than a university society: structured rosters with tryouts,
produced tournaments, its own live broadcast, and its own tooling. The
membership model reflects this — two distinct paths, Member and Roster, where
Roster carries an actual competitive bar. Few college clubs separate the two.

## Operating Context

Read almost entirely on phones, often in poor campus wifi, often standing at a
stall during a club fair with a queue behind them. Registration has to survive a
dropped connection. The site is also opened on a laptop by committee members
updating content between events.

## Capabilities and Constraints

Six surfaces: Blog (event photos, clips, Instagram embeds), Join (the two-path
registration form), FAQ (keyword-matched assistant plus full list), Players
(leaderboard and official roster), Updates (events, deadlines, results), and
About (new — the club's own account of itself).

Built as plain HTML, CSS and JavaScript with no build step, deliberately: the
people maintaining it are still learning, and all editable content is isolated
in `js/content.js` so a committee member can update a roster without touching
markup. Registrations go to Supabase; the keys are not yet filled in, so
submissions currently queue in the browser.

Undecided: what EDGE stands for as an acronym, if anything. The club's founding
date is recorded as 2026 but unconfirmed.

## Brand Commitments

The name EDGE. The mark at `assets/edge-mark.svg` — a hooded head with two eye
slits, traced from the club's own flag. Affiliation with Ramaiah University of
Applied Sciences. The wordmark renders the final E reversed.

## Evidence on Hand

**There is currently no real content, and this is the single most important
fact in this file.** No photographs of the club, no real roster names, no real
match results, no confirmed event dates, no Instagram handle. Every person,
score, event and statistic presently in `js/content.js` is placeholder material
written to demonstrate structure.

96 AI-generated frames of a Tekken character and the video they were cut from
were removed from `assets/` in September 2026. They were third-party
intellectual property and were never referenced by the site. Do not reintroduce
game characters, official artwork or fan art of them: original archetypes only.

Future work must not invent results, scores, member counts, sponsors or
testimonials to fill space. Where a surface needs content that does not exist,
it states the absence or is built to look correct while empty.

## Product Principles

1. Empty states are a first-class design problem here, not an afterthought.
   The site will launch with almost no real content and must still look
   deliberate rather than unfinished.
2. Registration is the point. Every surface should leave the next step obvious.
3. Legibility over expression on anything a member relies on — dates, rosters,
   standings.
4. Maintainable by someone still learning to code. No build step, no framework,
   content isolated from markup.
5. Never fabricate club history. An honest blank beats an invented achievement.

## Accessibility & Inclusion

Read predominantly on phones, outdoors, in variable light. The current build
fails WCAG AA on 8 text/background pairs and places 22 functional labels below
an 11px floor; both must be resolved. Nothing may depend on hover alone, since
the primary device has no cursor.
