/* ============================================================================
   EDGE — APP
   ----------------------------------------------------------------------------
   Tab routing, and the Blog, Players and Updates sections.
   The Join form lives in join.js and the FAQ assistant in faq-bot.js.

   You should not need to edit this file to change the site. Edit content.js.
   ========================================================================== */

(function () {
  "use strict";

  const C = typeof EDGE !== "undefined" ? EDGE : null;
  if (!C) { console.error("[EDGE] content.js did not load."); return; }

  const byId = id => document.getElementById(id);

  /** Build an element. Text goes in with textContent, never innerHTML, so a
      stray "<" in someone's name renders as a character instead of markup. */
  function el(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  const fill = (node, kids) => { if (node) node.replaceChildren(...kids); };

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  /** Parse "2026-09-28" as local midnight. Using new Date("2026-09-28")
      directly would parse it as UTC and can land on the previous day. */
  function parseDate(s, time) {
    if (!s) return null;
    const [y, m, d] = String(s).split("-").map(Number);
    if (!y || !m || !d) return null;
    const [hh, mm] = String(time || "00:00").split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0);
  }

  const startOfToday = () => { const t = new Date(); t.setHours(0,0,0,0); return t; };

  /* ========================================================== TAB ROUTER == */

  const TABS = ["about", "players", "updates", "join"];

  function showTab(name, push) {
    if (!TABS.includes(name)) name = TABS[0];

    document.querySelectorAll(".tab").forEach(btn => {
      const on = btn.dataset.tab === name;
      btn.setAttribute("aria-selected", String(on));
    });
    document.querySelectorAll(".panel").forEach(p => {
      p.classList.toggle("is-active", p.id === "panel-" + name);
    });

    if (push && location.hash !== "#" + name) {
      history.replaceState(null, "", "#" + name);
    }
    // Jump to the top so a tall previous tab does not leave the new one
    // scrolled halfway down.
    window.scrollTo({ top: 0, behavior: "auto" });

    if (window.__edgeHomeworld) window.__edgeHomeworld(name);
  }

  function initTabs() {
    const tabs = [...document.querySelectorAll(".tab")];

    tabs.forEach(btn => {
      btn.addEventListener("click", () => showTab(btn.dataset.tab, true));
    });

    // Left/right arrows move between tabs, which is what a screen-reader user
    // expects from anything marked up as a tablist.
    document.querySelector(".tabs").addEventListener("keydown", e => {
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      let next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      if (e.key === "ArrowLeft")  next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === "Home")       next = tabs[0];
      if (e.key === "End")        next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); next.focus(); showTab(next.dataset.tab, true); }
    });

    window.addEventListener("hashchange", () => showTab(location.hash.slice(1), false));
    showTab(location.hash.slice(1) || TABS[0], false);
  }

  /* ================================================================ BLOG == */

  let instagramScriptRequested = false;

  /** Instagram renders a pasted post URL by itself — no API key, no token,
      no developer account. We only pull their script in if there is actually
      an Instagram post to show. */
  function ensureInstagramScript() {
    if (instagramScriptRequested) {
      if (window.instgrm) window.instgrm.Embeds.process();
      return;
    }
    instagramScriptRequested = true;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.instagram.com/embed.js";
    document.body.append(s);
  }


  /* An empty section is a designed state here, not a gap. The site launches
     with almost no real content, so these get the same care as full ones. */
  function emptyState(title, detail) {
    const box = el("div", "empty");
    box.append(el("div", "empty__title", title));
    if (detail) box.append(el("p", null, detail));
    return box;
  }

  function postCard(p) {
    if (p.type === "instagram") {
      if (!p.url) return null;           // not filled in yet — skip silently

      const wrap = el("div", "post post--ig");
      const bq = document.createElement("blockquote");
      bq.className = "instagram-media";
      bq.setAttribute("data-instgrm-permalink", p.url);
      bq.setAttribute("data-instgrm-version", "14");

      // Shown until Instagram's script swaps in the real embed.
      const a = el("a", null, "View this post on Instagram");
      a.href = p.url;
      a.target = "_blank";
      a.rel = "noopener";
      bq.append(a);

      wrap.append(bq);
      return wrap;
    }

    const card = el("article", "post");

    // media --------------------------------------------------------------
    const media = el("div", "post__media");
    if (p.media) {
      if (/\.(mp4|webm|mov)$/i.test(p.media)) {
        const v = document.createElement("video");
        v.src = p.media;
        v.muted = true; v.loop = true; v.playsInline = true; v.controls = true;
        v.setAttribute("preload", "metadata");
        media.append(v);
      } else {
        const img = document.createElement("img");
        img.src = p.media;
        img.alt = p.alt || p.title || "";
        img.loading = "lazy";
        media.append(img);
      }
    } else {
      media.classList.add("post__media--empty");
      media.append(el("span", null, "Add media"));
    }
    card.append(media);

    // body ---------------------------------------------------------------
    const body = el("div", "post__body");
    const meta = el("div", "post__meta");
    const when = parseDate(p.date);
    if (when) meta.append(el("span", null,
      String(when.getDate()).padStart(2,"0") + " " + MONTHS[when.getMonth()] + " " + when.getFullYear()));
    if (p.tag) meta.append(el("span", "post__tag", p.tag));
    body.append(meta);

    if (p.title) body.append(el("h3", null, p.title));
    if (p.body)  body.append(el("p", null, p.body));
    if (p.credit) body.append(el("div", "post__credit", "Photo: " + p.credit));

    card.append(body);
    return card;
  }

  function renderBlog() {
    const grid = byId("blogGrid");
    const bar  = byId("blogFilters");
    if (!grid) return;

    // Only posts that are actually ready to show
    const posts = (C.blog || []).filter(p => p.type !== "instagram" || p.url);

    if (!posts.length) {
      fill(bar, []);
      fill(byId("blogLead"), []);
      fill(grid, [emptyState("Nothing posted yet",
        "Photos and clips from events land here. Add the first one in js/content.js under blog.")]);
      return;
    }

    // Newest first. Instagram entries have no date, so they sort to the end
    // unless you give them one.
    posts.sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));

    const tags = ["All", ...new Set(posts.map(p => p.tag).filter(Boolean))];
    let active = "All";

    function paint() {
      const visible = active === "All" ? posts : posts.filter(p => p.tag === active);
      const cards = visible.map(postCard).filter(Boolean);
      const lead = byId("blogLead");
      if (!cards.length) {
        fill(lead, []);
        fill(grid, [emptyState("Nothing here yet", "No posts tagged " + active + ".")]);
      } else {
        // Scale carries billing: the newest post runs at full width as the
        // lead, the rest sit smaller beneath it.
        fill(lead, [cards[0]]);
        fill(grid, cards.slice(1));
      }
      if (visible.some(p => p.type === "instagram")) ensureInstagramScript();
    }

    fill(bar, tags.map(t => {
      const b = el("button", "chip", t);
      b.type = "button";
      b.setAttribute("aria-pressed", String(t === active));
      b.addEventListener("click", () => {
        active = t;
        bar.querySelectorAll(".chip").forEach(c =>
          c.setAttribute("aria-pressed", String(c.textContent === t)));
        paint();
      });
      return b;
    }));

    paint();
  }

  /* ============================================================= PLAYERS == */

  function renderLeaderboard() {
    const body = byId("boardBody");
    if (!body) return;

    const rows = [...(C.players?.leaderboard || [])]
      .sort((a, b) => (b.points || 0) - (a.points || 0));

    const note = byId("boardNote");
    if (note) note.textContent = C.players?.leaderboardNote || "";

    if (!rows.length) {
      fill(body, [(() => {
        const tr = el("tr");
        const td = el("td", null, "No standings published yet.");
        td.colSpan = 7;
        td.style.color = "var(--ink-dim)";
        tr.append(td);
        return tr;
      })()]);
      return;
    }

    fill(body, rows.map((p, i) => {
      const tr = el("tr");

      tr.append(el("td", "rank", String(i + 1).padStart(2, "0")));

      const who = el("td");
      const box = el("div", "who");
      box.append(el("span", "ign", p.ign || "—"));
      if (p.name) box.append(el("span", "real", p.name));
      who.append(box);
      tr.append(who);

      tr.append(el("td", null, p.game || "—"));
      tr.append(el("td", "pts", String(p.points ?? 0)));
      tr.append(el("td", "num", String(p.w ?? 0)));
      tr.append(el("td", "num", String(p.l ?? 0)));

      const move = Number(p.move || 0);
      const cls  = move > 0 ? "move move--up" : move < 0 ? "move move--down" : "move move--same";
      const text = move > 0 ? "▲ " + move : move < 0 ? "▼ " + Math.abs(move) : "–";
      tr.append(el("td", cls, text));

      return tr;
    }));
  }

  function renderRosters() {
    const box = byId("viewRoster");
    if (!box) return;

    const teams = C.players?.rosters || [];
    if (!teams.length) {
      fill(box, [el("div", "empty", "No rosters published yet.")]);
      return;
    }

    fill(box, teams.map(team => {
      const block = el("div", "roster-block");

      const head = el("div", "roster-head");
      head.append(el("h3", null, team.name || team.game));
      head.append(el("span", "fmt", team.format || team.game || ""));
      const active = team.status !== "recruiting";
      const tag = el("span", "pill" + (active ? " pill--accent" : ""), active ? "Active" : "Recruiting");
      head.append(tag);
      block.append(head);

      const players = team.players || [];
      if (!players.length) {
        const empty = el("div", "roster-empty");
        empty.append(el("span", null, "Tryouts open — no roster announced yet."));
        const cta = el("a", "plate", "Try out");
        cta.href = "#join";
        empty.append(cta);
        block.append(empty);
      } else {
        const grid = el("div", "roster");
        players.forEach(p => {
          const card = el("div", "player");
          card.append(el("div", "ign", p.ign || "—"));
          if (p.name) card.append(el("div", "real", p.name));
          if (p.role) card.append(el("div", "role", p.role));
          grid.append(card);
        });
        block.append(grid);
      }
      return block;
    }));
  }

  function initPlayerViews() {
    const subtabs = [...document.querySelectorAll(".subtab")];
    const views = { leaderboard: byId("viewLeaderboard"), roster: byId("viewRoster") };

    subtabs.forEach(btn => btn.addEventListener("click", () => {
      const which = btn.dataset.view;
      subtabs.forEach(b => b.setAttribute("aria-selected", String(b === btn)));
      Object.entries(views).forEach(([k, node]) => { if (node) node.hidden = (k !== which); });
    }));
  }

  /* ============================================================= UPDATES == */

  const KIND_LABEL = { event: "Event", announcement: "Announcement", result: "Result", deadline: "Deadline" };

  function updateRow(u, isPast) {
    const row = el("div", "update update--" + (u.kind || "announcement") + (isPast ? " update--past" : ""));
    const when = parseDate(u.date, u.time);

    const date = el("div", "update__date");
    date.append(el("div", "update__d", when ? String(when.getDate()).padStart(2, "0") : "--"));
    date.append(el("div", "update__m", when ? MONTHS[when.getMonth()] + " " + when.getFullYear() : ""));
    row.append(date);

    const body = el("div");
    body.append(el("h3", null, u.title || ""));

    const bits = [];
    if (u.time)  bits.push(u.time);
    if (u.venue) bits.push(u.venue);
    if (bits.length) body.append(el("div", "update__meta", bits.join("  ·  ")));
    if (u.body) body.append(el("p", null, u.body));
    row.append(body);

    const tag = el("span", "pill" + (u.pinned && !isPast ? " pill--accent" : ""),
                   (u.pinned && !isPast ? "Pinned · " : "") + (KIND_LABEL[u.kind] || "Update"));
    row.append(tag);

    return row;
  }

  function renderUpdates() {
    const list = byId("updatesList");
    const archiveBox = byId("updatesArchive");
    if (!list) return;

    const all = C.updates || [];
    const today = startOfToday();

    const upcoming = all.filter(u => { const d = parseDate(u.date, u.time); return d && d >= today; });
    const past     = all.filter(u => { const d = parseDate(u.date, u.time); return !d || d < today; });

    // Pinned first, then soonest.
    upcoming.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
                         || parseDate(a.date, a.time) - parseDate(b.date, b.time));
    past.sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));

    fill(list, upcoming.length
      ? upcoming.map(u => updateRow(u, false))
      : [emptyState("Nothing scheduled", "Event dates are posted here as soon as they are confirmed.")]);

    if (archiveBox) {
      if (past.length) {
        const head = el("div", "updates-divider");
        head.append(el("span", null, "Earlier"));
        const wrap = el("div", "updates");
        past.forEach(u => wrap.append(updateRow(u, true)));
        archiveBox.replaceChildren(head, wrap);
      } else {
        archiveBox.replaceChildren();
      }
    }

    renderCountdown(upcoming);
    markUpdatesBadge(upcoming);
  }

  /** A live countdown to the next dated thing. */
  function renderCountdown(upcoming) {
    const slot = byId("countdownSlot");
    if (!slot) return;

    const next = upcoming.find(u => u.kind === "event") || upcoming[0];
    const when = next && parseDate(next.date, next.time);
    if (!next || !when) { slot.replaceChildren(); return; }

    const box = el("div", "countdown");
    const left = el("div");
    left.append(el("div", "countdown__label", "Next up"));
    left.append(el("div", "countdown__title", next.title || ""));
    box.append(left);

    const clock = el("div", "countdown__clock");
    const units = [["days","Days"],["hours","Hours"],["mins","Mins"],["secs","Secs"]]
      .map(([key, label]) => {
        const u = el("div", "cd-unit");
        const b = el("b", null, "--");
        u.append(b, el("span", null, label));
        clock.append(u);
        return b;
      });
    box.append(clock);
    slot.replaceChildren(box);

    function tick() {
      const ms = when - new Date();
      if (ms <= 0) {
        units.forEach(u => u.textContent = "00");
        clearInterval(timer);
        return;
      }
      const s = Math.floor(ms / 1000);
      const v = [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60];
      units.forEach((node, i) => node.textContent = String(v[i]).padStart(2, "0"));
    }
    tick();
    const timer = setInterval(tick, 1000);
  }

  /** Put a dot on the Updates tab when something is coming in the next week. */
  function markUpdatesBadge(upcoming) {
    const tab = document.querySelector('[data-tab="updates"]');
    if (!tab) return;
    const week = Date.now() + 7 * 86400000;
    const soon = upcoming.some(u => {
      const d = parseDate(u.date, u.time);
      return d && d.getTime() <= week;
    });
    if (soon && !tab.querySelector(".tab__dot")) {
      const dot = el("span", "tab__dot");
      dot.setAttribute("aria-label", "New");
      tab.append(dot);
    }
  }

  /* ============================================================== FOOTER == */

  function renderFooter() {
    const tagline = byId("footerTagline");
    if (tagline) tagline.textContent = C.club?.tagline || "";

    const uni = byId("footerUni");
    if (uni) uni.textContent = C.club?.university || "";

    const year = byId("year");
    if (year) year.textContent = new Date().getFullYear();

    const links = byId("footerLinks");
    if (!links) return;

    const out = [
      ["instagram", "Instagram", v => v],
      ["discord",   "Discord",   v => v],
      ["youtube",   "YouTube",   v => v],
      ["email",     "Email",     v => "mailto:" + v]
    ].filter(([k]) => C.club?.[k])
     .map(([k, label, href]) => {
        const a = el("a", null, label);
        a.href = href(C.club[k]);
        if (k !== "email") { a.target = "_blank"; a.rel = "noopener"; }
        return a;
     });

    fill(links, out);
  }

  /* ================================================================= BOOT == */


  /* == ABOUT =============================================================== */

  function renderAbout() {
    const A = C.about || {};

    const lead = byId("aboutLead");
    if (lead) lead.textContent = A.lead || "";

    fill(byId("aboutBody"), (A.body || []).map(t => el("p", null, t)));

    // Facts are lettered as term/value pairs rather than set as stat cards.
    const facts = byId("aboutFacts");
    if (facts) {
      fill(facts, (A.facts || []).map(f => {
        const row = el("div");
        row.append(el("dt", null, f.label), el("dd", null, f.value));
        return row;
      }));
    }

    fill(byId("aboutPillars"), (A.pillars || []).map(x => {
      const b = el("div", "pillar");
      b.append(el("h3", null, x.title), el("p", null, x.body));
      return b;
    }));

    // The committee list hides itself entirely when nobody is listed, rather
    // than showing an empty heading.
    const crew = A.crew || [];
    const wrap = byId("aboutCrewWrap");
    if (wrap) {
      wrap.hidden = !crew.length;
      if (crew.length) {
        fill(byId("aboutCrew"), crew.map(m => {
          const c = el("div", "crew-member");
          c.append(el("div", "nm", m.name), el("div", "rl", m.role));
          return c;
        }));
      }
    }
  }


  /* == ASK EDGE — PORTAL ENTRY ============================================ */

  /* The launcher no longer opens a panel. It tears a portal to another
     dimension, and js/portal.js owns the effect. This function is only the
     wiring: when to peek, when to commit, when to come back.

     Hover opens a small tear and starts the sound bleeding through, so the
     other side is visible from here. Clicking crosses over. Leaving closes it
     again. The invitation is immediate; the commitment is always a click. */

  function initAsk() {
    const fab   = byId("askFab");
    const world = byId("faqWorld");
    const back  = byId("worldBack");
    const video = byId("faqVideo");
    if (!fab || !world || !video) return;

    const P = window.EDGE_PORTAL;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lastFocus = null, attached = false;

    // The world's video is only fetched when the visitor shows intent, the
    // same rule the homepage film follows.
    function attach() {
      if (attached) return;
      attached = true;
      video.src = "assets/video/faq-world.mp4";
      video.load();
      video.volume = 0;                       // ramped up, never snapped
      P?.configure({ video, origin: fab, volume: 0.4 });
    }

    function enter() {
      lastFocus = document.activeElement;
      // Promote the video from texture source to the world's actual backdrop.
      // The canvas performs the transition; the arrived world is plain DOM, so
      // it is solid even if WebGL stops, stalls or was never available.
      video.classList.add("is-world");
      world.hidden = false;
      void world.offsetWidth;            // give the fade a start value
      world.classList.add("is-in");
      fab.setAttribute("aria-expanded", "true");
      byId("chatInput")?.focus();
      document.body.style.overflow = "hidden";
    }

    function leave() {
      video.classList.remove("is-world");
      world.classList.remove("is-in");
      fab.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      setTimeout(() => { world.hidden = true; }, 450);
      lastFocus?.focus();
    }

    function commit() {
      attach();
      if (!P || reduced || !P.supported()) { enter(); return; }   // no WebGL: just go
      P.open({ video, origin: fab, volume: 0.4, onEnter: enter });
    }

    // Only retracts a peek. Once the portal has committed, moving the pointer
    // off the button must do nothing: you are crossing over, and closing from
    // here tore down the portal while leaving the interface stranded on top of
    // the homepage. Leaving is exit()'s job, and exit() hides both.
    function abort() {
      if (P && !P.isOpen()) P.peek(false);
    }

    // Hover only opens the tear. It never crosses over on its own: being
    // teleported by a mouse path that happened to pass the corner is hostile,
    // and there is no way to glance at the other side without committing.
    fab.addEventListener("pointerenter", () => {
      attach();
      if (reduced || !P || !P.supported()) return;
      P.peek(true);
    });
    fab.addEventListener("pointerleave", abort);
    fab.addEventListener("click", commit);
    // Keyboard reaches the same place without needing a pointer at all.
    fab.addEventListener("focus", attach);

    function exit() {
      // Close the portal even when the interface never appeared — otherwise a
      // transition that stalled leaves the world audible with no way out.
      if (!world.hidden) leave();
      P?.close();
    }
    back?.addEventListener("click", exit);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") { if (!world.hidden) exit(); else abort(); }
    });

    // A hidden tab should not keep a second video decoding and audible.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && P) P.suspend();
    });
  }


  /* == MAGNETIC LAUNCHER =================================================== */

  /* The button leans toward the cursor as it comes near, then settles back.
     It reads as the thing on the other side reaching for you, which is the
     only reason it is here — a magnet on an ordinary button would be noise.

     The element's rect is cached rather than measured per pointer event:
     getBoundingClientRect forces layout, and doing that on every mousemove is
     exactly how a small flourish turns into jank. The launcher is
     position:fixed, so the rect only changes on resize. */
  function initMagnet(el) {
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const RADIUS = 140;    // px at which the pull begins
    const PULL   = 0.34;   // fraction of the offset the button travels
    let box = null;

    const measure = () => { box = el.getBoundingClientRect(); };
    measure();
    window.addEventListener("resize", measure, { passive: true });

    function set(x, y) {
      el.style.setProperty("--mx", x.toFixed(1) + "px");
      el.style.setProperty("--my", y.toFixed(1) + "px");
    }

    window.addEventListener("pointermove", e => {
      if (!box || !box.width) measure();
      const dx = e.clientX - (box.left + box.width  / 2);
      const dy = e.clientY - (box.top  + box.height / 2);
      const dist = Math.hypot(dx, dy);

      if (dist > RADIUS) {
        // Only write when there is something to clear, so an idle pointer
        // anywhere else on the page costs nothing.
        if (el.style.getPropertyValue("--mx") !== "0px") set(0, 0);
        return;
      }
      // Falls off with distance, so the pull is strongest up close.
      const force = (1 - dist / RADIUS) * PULL;
      set(dx * force, dy * force);
    }, { passive: true });

    // A pointer that leaves the window never sends another move event.
    document.addEventListener("pointerleave", () => set(0, 0));
  }

  /* == HOVER GLITCH ======================================================== */

  /* The effect needs the element's own string in a data attribute so CSS can
     draw two offset copies of it. Setting it here keeps the markup clean and
     means it also applies to anything rendered from content.js.

     Skipped for elements that already use ::before or ::after (a tab's active
     underline, a summary's +/- marker), which the glitch copies would replace.

     `textContent` is read, not innerHTML, so a stray "<" in a roster tag stays
     a character. */
  function initGlitch() {
    const SELECTOR = [
      ".panel__head h1", ".sec-title", ".path__name",
      ".player .ign", ".post h3", ".ask__title", ".roster-head h3"
    ].join(", ");

    document.querySelectorAll(SELECTOR).forEach(nodeGlitch);
  }

  function nodeGlitch(node) {
    const text = node.textContent.trim();
    if (!text || text.length > 60) return;   // long strings judder unpleasantly
    node.dataset.text = text;
    node.classList.add("glitch");
  }


  /* == HOMEWORLD =========================================================== */

  /* The looping film behind the first viewport.

     Three things govern it, all of them about not wasting the visitor's data
     or battery:

       1. The source is attached in JS, not in the markup, so the 7.9 MB file
          is never fetched on a metered connection or when the visitor has
          asked for reduced motion. The poster still shows, so the surface is
          never empty.
       2. It only plays on About. Every other tab hides it and pauses it.
       3. It pauses when the document is hidden and when the first viewport has
          been scrolled past, because a loop nobody can see is pure cost.       */

  const VIDEO_SRC = "assets/video/homeworld.mp4";

  function initHomeworld() {
    const layer = byId("homeworld");
    const video = byId("homeworldVideo");
    const scrim = byId("homeworldScrim");
    if (!layer || !video) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn    = navigator.connection || {};
    const thrifty = conn.saveData === true || /2g/.test(conn.effectiveType || "");

    let attached = false;
    let onScreen = true;

    function attach() {
      if (attached || reduced || thrifty) return;
      attached = true;
      video.src = VIDEO_SRC;
      video.load();
    }

    function wanted() {
      return layer.classList.contains("is-on") && onScreen && !document.hidden;
    }

    function sync() {
      if (!attached) return;
      if (wanted()) {
        // play() rejects if the browser refuses autoplay. The poster is still
        // showing, so there is nothing to recover from.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }

    // Shown only on About. showTab calls this on every switch.
    window.__edgeHomeworld = function (tab) {
      const on = tab === "about";
      layer.classList.toggle("is-on", on);
      if (on) attach();
      sync();
    };

    // Raise the scrim as the first viewport scrolls away, so the film is fully
    // covered by the time the content surface reaches the top.
    // Done synchronously in the passive listener rather than inside
    // requestAnimationFrame. Reading scrollY does not force layout and setting
    // a custom property is cheap, so the throttle bought nothing — and it made
    // correctness depend on rAF firing, which is exactly what left the drawer
    // stranded off-screen in a throttled renderer.
    function onScroll() {
      const h = window.innerHeight || 1;
      const p = Math.min(window.scrollY / h, 1);
      scrim?.style.setProperty("--scrim", (p * 0.92).toFixed(3));

      const nowOn = p < 1;
      if (nowOn !== onScreen) { onScreen = nowOn; sync(); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    document.addEventListener("visibilitychange", sync);
  }

  /* == SCROLL REVEAL ======================================================= */

  /* Content paints on with the same left-to-right wipe as the panel entrance.
     Elements start visible in the stylesheet's reduced-motion path, so a
     failed script can never leave the page blank. */
  function initReveals() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets = document.querySelectorAll(
      ".home-content .panel__head, .home-content .about-grid, .home-content .facts, " +
      ".home-content .pillars > *, .home-content .sec-title, .home-content .sec-note, " +
      ".home-content .filters, .home-content .blog-lead, .home-content .blog-grid > *, " +
      ".home-content .crew > *"
    );

    targets.forEach(node => node.classList.add("rise"));

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        obs.unobserve(entry.target);          // one-way; never re-hides
      });
    }, { threshold: .12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(node => io.observe(node));

    // Safety net. `.rise` hides its element until the observer says otherwise,
    // so an observer that never fires would leave the page blank — the one
    // failure mode a scroll reveal must not have. If nothing at all has
    // revealed shortly after load, assume it is not working and show
    // everything. It only ever triggers when the effect is already broken.
    setTimeout(() => {
      if (!document.querySelector(".rise.is-in")) {
        targets.forEach(node => node.classList.add("is-in"));
      }
    }, 2000);
  }

  function init() {
    initHomeworld();
    initTabs();
    initAsk();
    initMagnet(byId("askFab"));
    renderBlog();
    renderAbout();
    renderLeaderboard();
    renderRosters();
    initPlayerViews();
    renderUpdates();
    renderFooter();

    // Both read nodes the renderers have just created.
    initReveals();
    initGlitch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
