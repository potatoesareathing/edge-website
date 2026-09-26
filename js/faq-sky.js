/* ============================================================================
   EDGE — THE SKY BEHIND THE QUESTIONS
   ----------------------------------------------------------------------------
   Slow drifting points at three depths, with faint lines drawn between the
   ones that happen to be near each other. It reads as a star field that keeps
   finding constellations in itself and losing them again.

   WHY IT IS ALLOWED TO BE THERE AT ALL

   The panel's previous background was a still image of the club mark, and
   before that a film. Both were pictures, and a picture behind a paragraph is
   something the eye keeps trying to resolve. Points of light are not a
   picture: there is nothing to read, nothing to recognise, and no edge that
   lines up with a line of text. That is what makes it safe to move.

   It is kept honest by three numbers, measured rather than intended:
     - at rest nothing exceeds 58% white, against text at 96% sitting on an
       opaque board. The few stars under the pointer lift to a ceiling of 82%,
       briefly, and the panels the text sits on are not transparent, so this
       is never contrast the reader has to fight
     - the brightest star is 1.9px across, at one per ~6200px^2 -- roughly 1%
       of the panel is lit at any moment
     - the whole field drifts at well under a pixel per frame

   Canvas 2D rather than WebGL. This is a few hundred line segments and dots;
   a GPU context would be more code, another thing to lose, and no faster at
   this size. The hero's extruded mark needs WebGL because it needs a
   perspective divide. This needs arithmetic.

   COST CONTROL

   Nothing runs while the panel is shut. The loop is started when the drawer
   opens and stopped when it closes or the tab is hidden, so a panel nobody
   has opened costs one IntersectionObserver and nothing else.
   ========================================================================== */

(function () {
  "use strict";

  /* Three depths. Far stars are smaller, dimmer and slower, which is the
     whole of the parallax: no layers, no transforms, just three populations
     moving at different speeds in the same field. */
  const DEPTHS = [
    { count: 0.46, size: [0.6, 1.0], alpha: [0.18, 0.30], speed: 0.10 },
    { count: 0.34, size: [0.9, 1.4], alpha: [0.28, 0.44], speed: 0.18 },
    { count: 0.20, size: [1.2, 1.9], alpha: [0.40, 0.58], speed: 0.30 }
  ];

  const DENSITY   = 1 / 6200;   // stars per square pixel
  const MAX_STARS = 230;        // a narrow panel never needs more
  const LINK_DIST = 86;         // px within which two stars are joined
  const LINK_MAX  = 0.20;       // alpha of the strongest link

  const rand = (a, b) => a + Math.random() * (b - a);

  function init() {
    const canvas = document.getElementById("faqSky");
    const panel  = document.getElementById("faqWorld");
    if (!canvas || !panel) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars = [];
    let w = 0, h = 0, dpr = 1;
    let raf = 0;
    let pointer = null;       // {x, y} in CSS px, or null when away

    /* -- building the field ------------------------------------------------ */

    function build() {
      const target = Math.min(MAX_STARS, Math.round(w * h * DENSITY));
      stars = [];
      DEPTHS.forEach(d => {
        const n = Math.round(target * d.count);
        for (let i = 0; i < n; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: rand(d.size[0], d.size[1]),
            a: rand(d.alpha[0], d.alpha[1]),
            // A direction each, mostly upward, so the field has a drift
            // rather than a current. A field that all moves one way reads
            // as a background scrolling past; this reads as space.
            vx: rand(-0.5, 0.5) * d.speed,
            vy: rand(-1, -0.25) * d.speed,
            // Each blinks on its own slow cycle, offset so they never pulse
            // together -- a field that breathes in unison looks mechanical.
            tw: Math.random() * Math.PI * 2,
            tws: rand(0.4, 1.1)
          });
        }
      });
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nw = Math.round(r.width * dpr), nh = Math.round(r.height * dpr);
      if (canvas.width !== nw || canvas.height !== nh) {
        canvas.width = nw; canvas.height = nh;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // draw in CSS pixels
        w = r.width; h = r.height;
        build();
      }
      return true;
    }

    /* -- drawing ----------------------------------------------------------- */

    function draw(now) {
      raf = 0;
      if (!resize()) { schedule(); return; }

      const t = (now || 0) / 1000;
      ctx.clearRect(0, 0, w, h);

      // Links first, so stars sit on top of their own lines.
      ctx.lineWidth = 1;
      for (let i = 0; i < stars.length; i++) {
        const a = stars[i];
        for (let j = i + 1; j < stars.length; j++) {
          const b = stars[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          if (Math.abs(dx) > LINK_DIST || Math.abs(dy) > LINK_DIST) continue;
          const d = Math.hypot(dx, dy);
          if (d > LINK_DIST) continue;
          // Fades to nothing exactly at the threshold, so a link never
          // appears or vanishes as a hard edge.
          const k = (1 - d / LINK_DIST) * LINK_MAX;
          ctx.strokeStyle = "rgba(245,245,243," + k.toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const s of stars) {
        if (!still) {
          s.x += s.vx;
          s.y += s.vy;
          // Wrap, with a margin so nothing pops at the edge.
          if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
          if (s.y < -4) s.y = h + 4; else if (s.y > h + 4) s.y = -4;
        }

        let a = s.a;
        if (!still) a *= 0.72 + 0.28 * Math.sin(t * s.tws + s.tw);

        // The pointer lifts the stars nearest it, so the field acknowledges
        // the cursor without anything actually chasing it.
        if (pointer) {
          const d = Math.hypot(s.x - pointer.x, s.y - pointer.y);
          if (d < 110) a += (1 - d / 110) * 0.30;
        }

        ctx.fillStyle = "rgba(245,245,243," + Math.min(a, 0.82).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // A still field is drawn once and left alone.
      if (!still || pointer) schedule();
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(draw);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    /* -- only while the panel is open -------------------------------------- */

    /* The drawer is shown and hidden with the `hidden` attribute, so watching
       that attribute is the authoritative signal -- it is the same thing the
       browser uses to decide whether to paint the panel, so the two cannot
       disagree.

       This was an IntersectionObserver first, which was a mistake of the same
       family as using requestAnimationFrame for correctness. An observer
       reports on geometry, and geometry can go strange for reasons that have
       nothing to do with whether the panel is open: a viewport briefly
       measuring zero stopped the loop and no intersection change ever came to
       start it again, so the sky was simply dead until the drawer was closed
       and reopened. The attribute is a fact; geometry is a consequence. */
    const open = () => { if (!panel.hidden) { resize(); schedule(); } else stop(); };

    new MutationObserver(open).observe(panel, {
      attributes: true, attributeFilter: ["hidden"]
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop(); else open();
    });

    open();                                    // in case it is already showing

    panel.addEventListener("pointermove", e => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      schedule();
    }, { passive: true });

    panel.addEventListener("pointerleave", () => { pointer = null; }, { passive: true });

    // A resize changes the field's dimensions, so it must re-measure, not just
    // draw another frame at the old size.
    window.addEventListener("resize", open, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
