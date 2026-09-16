/* ============================================================================
   EDGE — INTERFACE SOUND
   ----------------------------------------------------------------------------
   A dry tick when something is pressed.

   Synthesised with Web Audio rather than loaded as a file. Three reasons: no
   asset to download on a phone on campus wifi, no format juggling, and a
   click generated from an envelope is shorter and drier than any small sample
   tends to be.

   Two voices, because not everything deserves the same weight:
     tap      quiet, high, for chips, tabs, disclosure rows
     press    lower and fuller, for primary actions and crossing worlds

   Browsers refuse audio before the visitor has interacted, so the context is
   created on the first real gesture and nothing before that makes a sound.
   Every trigger here IS a click, so that condition is met by construction.

   The volume is deliberately low. A UI tick that announces itself is worse
   than silence, and this one is meant to be felt rather than heard.
   ========================================================================== */

(function () {
  "use strict";

  const VOICES = {
    tap:   { from: 1500, to: 620, peak: 0.028, len: 0.055 },
    press: { from: 900,  to: 260, peak: 0.055, len: 0.085 }
  };

  let ctx = null;
  let muted = false;

  function context() {
    if (muted) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;                       // no Web Audio: stay silent
    if (!ctx) {
      try { ctx = new AC(); } catch { muted = true; return null; }
    }
    // Suspended is normal until a gesture unlocks it.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function play(name) {
    const c = context();
    if (!c || c.state !== "running") return;

    const v = VOICES[name] || VOICES.tap;
    const t = c.currentTime;

    const osc  = c.createOscillator();
    const gain = c.createGain();
    // A highpass keeps it a tick rather than a thud on laptop speakers.
    const hp   = c.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 320;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(v.from, t);
    osc.frequency.exponentialRampToValueAtTime(v.to, t + v.len);

    // Exponential ramps cannot touch zero, hence the tiny floor values.
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(v.peak, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + v.len);

    osc.connect(hp).connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + v.len + 0.02);
  }

  /* Which control gets which voice. Delegated from the document, so anything
     rendered later from content.js is covered without rebinding. */
  const PRESS = ".plate--primary, .ask-fab, .world__back, .path, .subtab";
  const TAP   = ".tab, .chip, .plate, .check span, .faq-item summary, .footer__links a";

  document.addEventListener("pointerdown", e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.closest(PRESS)) { play("press"); return; }
    if (t.closest(TAP))   { play("tap"); }
  }, { passive: true });

  window.EDGE_SOUND = {
    play,
    mute(on) { muted = !!on; },
    get muted() { return muted; }
  };
})();
