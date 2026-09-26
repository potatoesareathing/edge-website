/* ============================================================================
   EDGE — INTRO
   ----------------------------------------------------------------------------
   The mark resolves out of the dark before the site appears. 4.2 seconds.

   An intro is the easiest thing on a site to get wrong, because it stands
   between somebody and what they came for. Five rules keep it from becoming
   an obstacle:

     1. ONCE PER SESSION. Not once per page load. Someone switching tabs and
        coming back does not sit through it again. sessionStorage, so it
        returns on their next visit but never twice in one sitting.
     2. ALWAYS SKIPPABLE. Tap anywhere, press any key, or use the Skip
        control. No dwell time, no "wait for it".
     3. NEVER TRAPS. If the file stalls, is blocked, or the browser refuses
        to play it, a timer clears the overlay anyway. The failure mode of an
        intro must be "no intro", never "no website".
     4. OFF UNDER REDUCED MOTION. Decided before the overlay is ever shown,
        in the inline script in index.html, so there is no flash of it.
     5. COSTS NOTHING TO SKIP. 24 KB. Smaller than most of the photographs
        that will end up in the blog.

   The overlay is in the markup and shown by a class on <html> set before
   first paint, rather than created here. Building it in JavaScript would let
   the site paint first and then be covered, which looks like a bug.
   ========================================================================== */

(function () {
  "use strict";

  const root  = document.documentElement;
  if (!root.classList.contains("intro-on")) return;   // decided already: skip

  const layer = document.getElementById("intro");
  const video = document.getElementById("introVideo");

  /* If the markup is not there, do not leave the class stranded on <html> —
     it hides the page's scrolling. */
  if (!layer || !video) { root.classList.remove("intro-on"); return; }

  let done = false;

  function end() {
    if (done) return;
    done = true;

    try { sessionStorage.setItem("edge_intro_seen", "1"); } catch (e) {}

    clearTimeout(stall);
    video.pause();
    layer.classList.add("is-out");

    // Let the fade finish, then take the layer out of the page entirely so it
    // can never intercept a click. transitionend is not used: it does not
    // fire if the element is display:none'd or the transition is skipped.
    setTimeout(() => {
      root.classList.remove("intro-on");
      layer.remove();
      video.removeAttribute("src");        // release the decoder
      video.load();
    }, 520);
  }

  /* -- getting out ------------------------------------------------------- */

  video.addEventListener("ended", end, { once: true });
  layer.addEventListener("click", end);
  document.addEventListener("keydown", end, { once: true });

  // Touch devices fire click reliably here, but a swipe that never becomes a
  // tap does not. Treat any touch as intent to move on.
  layer.addEventListener("touchstart", end, { passive: true });

  /* -- the safety net ---------------------------------------------------- */

  /* Long enough that a healthy playback is never cut short (4.2s of film),
     short enough that a stall is not a wall. Reset once playback actually
     starts, so a slow connection gets its full run rather than being timed
     out mid-film. */
  let stall = setTimeout(end, 6000);
  video.addEventListener("playing", () => {
    clearTimeout(stall);
    const left = Math.max(0, (video.duration || 4.3) - video.currentTime);
    stall = setTimeout(end, (left + 1.2) * 1000);
  }, { once: true });

  /* -- starting ---------------------------------------------------------- */

  video.src = "assets/video/intro.mp4";
  video.load();

  /* Autoplay is only permitted for muted video, which this is. If the browser
     refuses anyway there is nothing to recover: skip to the site rather than
     showing a frozen black rectangle. */
  const started = video.play();
  if (started && typeof started.catch === "function") started.catch(end);

  video.addEventListener("error", end, { once: true });
})();
