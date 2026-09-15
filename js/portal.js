/* ============================================================================
   EDGE — DIMENSIONAL PORTAL
   ----------------------------------------------------------------------------
   A reusable transition. A tear opens at a point on screen, another world is
   visible through it, and the tear grows until that world is all there is.

   HOW IT WORKS, AND WHY IT IS CHEAP

   The canvas draws ONLY the destination world, and writes alpha 0 everywhere
   outside the tear. The real page — its own video, its DOM, everything — is
   simply still there underneath, showing through. Nothing about the homepage
   is captured, re-rendered or duplicated, which is what keeps this to a single
   fullscreen quad and one fragment shader.

   Raw WebGL rather than a 3D library: there is no scene, no camera and no
   geometry beyond two triangles. A scene graph would be several hundred
   kilobytes to do less.

   The rim is where the work is — an irregular noise-driven edge, a refraction
   pull that drags the world toward the opening, chromatic aberration split
   along the radius, and a thin light. All of it fades out as the tear grows,
   so what you are left with is a clean image rather than a permanent effect.

   USAGE

     EDGE_PORTAL.open({
       video:  <HTMLVideoElement>,   the destination world
       origin: <HTMLElement>,        the tear opens from its centre
       volume: 0.4,                  audio ceiling, ramped not snapped
       onEnter(), onExit()           called at the ends of the transition
     });
     EDGE_PORTAL.peek(on);           partial opening, for hover
     EDGE_PORTAL.close();

   The same call works for any other world later; only the video changes.
   ========================================================================== */

(function () {
  "use strict";

  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;

    uniform sampler2D uTex;
    uniform vec2  uRes;        // canvas size, px
    uniform vec2  uTexRes;     // video size, px
    uniform vec2  uCenter;     // where the tear opens, px
    uniform float uProgress;   // 0 closed .. 1 covering the viewport
    uniform float uMaxR;       // radius that covers the viewport
    uniform float uTime;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }

    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
      return v;
    }

    // The world is 16:9 and the viewport is not. Fill it the way object-fit:
    // cover would, cropping the long axis rather than stretching the image.
    vec2 coverUv(vec2 uv) {
      float target = uRes.x / uRes.y;
      float source = uTexRes.x / uTexRes.y;
      vec2 s = source > target ? vec2(target / source, 1.0)
                               : vec2(1.0, source / target);
      return (uv - 0.5) * s + 0.5;
    }

    void main() {
      vec2 frag = vUv * uRes;
      vec2 d    = frag - uCenter;
      float dist = length(d);
      float ang  = atan(d.y, d.x);

      // An irregular opening, not a circle. The wobble is strongest while the
      // tear is small and settles as it grows, so the finished world is not
      // permanently rippling at its edges.
      float wob = fbm(vec2(cos(ang), sin(ang)) * 2.4 + uTime * 0.05);
      float r   = uProgress * uMaxR;
      r *= 1.0 + (wob - 0.5) * 0.26 * (1.0 - uProgress * 0.8);

      float edge = 1.5 + 54.0 * (1.0 - uProgress);
      float mask = 1.0 - smoothstep(r - edge, r + edge, dist);
      if (mask <= 0.002) discard;             // nothing drawn outside the tear

      // 0 in the middle of the opening, 1 at its rim.
      float rim = smoothstep(r - edge * 3.2, r, dist);
      float settle = 1.0 - uProgress * 0.7;   // effects recede as it opens

      vec2 uv  = coverUv(vUv);
      vec2 dir = normalize(d + 1e-6);

      // Refraction: the world is pulled toward the opening near its edge, the
      // way something seen through a lens bends at the boundary.
      uv -= dir * rim * 0.055 * settle;

      // Chromatic aberration split along the radius, a fraction of a percent.
      float ca = rim * 0.0055 * settle;
      vec3 col;
      col.r = texture2D(uTex, uv + dir * ca).r;
      col.g = texture2D(uTex, uv).g;
      col.b = texture2D(uTex, uv - dir * ca).b;

      // A thin light on the tear itself. Monochrome, no hue added.
      col += pow(rim, 7.0) * 0.55 * settle;

      gl_FragColor = vec4(col, mask);
    }`;

  /* -- state -------------------------------------------------------------- */

  let canvas, gl, program, tex, buf;
  let uni = {};
  let video = null, origin = null;
  let raf = 0, running = false, started = 0;

  let progress = 0, target = 0;
  let volumeCeiling = 0.4;
  let hooks = {};
  let ready = false, failed = false;
  let entered = false;   // onEnter is fired once per opening

  // Audio may only begin after the visitor has interacted with the page.
  // Until then a hover opens the portal in silence rather than throwing.
  let gestured = false;
  ["pointerdown", "pointerup", "click", "keydown", "touchstart"].forEach(evt =>
    window.addEventListener(evt, () => { gestured = true; }, { once: true, passive: true })
  );

  /* -- setup -------------------------------------------------------------- */

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn("[portal] shader:", gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function setup() {
    if (ready || failed) return ready;

    canvas = document.getElementById("portalCanvas");
    if (!canvas) { failed = true; return false; }

    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false,
                                      antialias: false, depth: false });
    if (!gl) { failed = true; return false; }

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { failed = true; return false; }

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { failed = true; return false; }
    gl.useProgram(program);

    // Two triangles covering clip space.
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    ["uTex","uRes","uTexRes","uCenter","uProgress","uMaxR","uTime"]
      .forEach(n => { uni[n] = gl.getUniformLocation(program, n); });

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    // The video is not power-of-two, so clamp and use linear without mipmaps.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    window.addEventListener("resize", resize, { passive: true });
    resize();
    ready = true;
    return true;
  }

  function resize() {
    if (!canvas) return;
    // Cap the pixel ratio. Past 1.5 the extra fragments cost real frames on a
    // phone and nobody can see the difference in a moving image.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width  = Math.round(innerWidth  * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }

  /* -- the loop ----------------------------------------------------------- */

  function centre() {
    if (!origin) return [canvas.width / 2, canvas.height / 2];
    const r = origin.getBoundingClientRect();
    const dpr = canvas.width / innerWidth;
    // Y is flipped: WebGL's origin is bottom-left, the DOM's is top-left.
    return [(r.left + r.width / 2) * dpr,
            canvas.height - (r.top + r.height / 2) * dpr];
  }

  function maxRadius(cx, cy) {
    // Distance to the furthest corner, so the tear is guaranteed to cover.
    return Math.hypot(Math.max(cx, canvas.width - cx),
                      Math.max(cy, canvas.height - cy));
  }

  function frame(now) {
    if (!running) return;

    // Ease toward the target rather than animating a fixed timeline, so a
    // hover that becomes a click never restarts or jumps.
    progress += (target - progress) * 0.085;
    if (Math.abs(target - progress) < 0.0015) progress = target;

    if (video && video.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      gl.uniform2f(uni.uTexRes, video.videoWidth || 1920, video.videoHeight || 1080);
    }

    const [cx, cy] = centre();
    gl.uniform2f(uni.uRes, canvas.width, canvas.height);
    gl.uniform2f(uni.uCenter, cx, cy);
    gl.uniform1f(uni.uProgress, progress);
    gl.uniform1f(uni.uMaxR, maxRadius(cx, cy));
    gl.uniform1f(uni.uTime, (now - started) / 1000);
    gl.uniform1i(uni.uTex, 0);

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Hand over the moment the tear has actually covered the viewport, not on
    // a timer. A fixed delay guessed at the easing and let the interface fade
    // up while the homepage was still visible behind a half-open portal.
    if (target === 1 && !entered && progress >= 0.985) {
      entered = true;
      hooks.onEnter?.();
    }

    // Fully closed and nothing pending: stop burning frames.
    if (progress === 0 && target === 0) { stop(); return; }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    started = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    canvas?.classList.remove("is-live");
  }

  /* -- audio -------------------------------------------------------------- */

  /* Ramped on a timer rather than requestAnimationFrame. The ramp decides
     whether sound is audible at all, and rAF does not reliably fire in a
     throttled renderer — the same trap that once left the drawer stranded
     off-screen. A 40 ms interval is inaudible as steps. */
  let ramp = 0;

  function rampTo(value, ms) {
    clearInterval(ramp);
    if (!video) return;
    const from = video.volume;
    const steps = Math.max(1, Math.round(ms / 40));
    let i = 0;
    ramp = setInterval(() => {
      i++;
      const t = Math.min(i / steps, 1);
      video.volume = Math.max(0, Math.min(1, from + (value - from) * t));
      if (t >= 1) clearInterval(ramp);
    }, 40);
  }

  function sound(on) {
    if (!video) return;
    if (on) {
      if (!gestured) return;          // autoplay policy: stay silent until then
      video.muted = false;
      // Always ramp up from silence. Starting from the element default of 1
      // would blast the first frame of sound at full volume.
      if (video.volume > volumeCeiling) video.volume = 0;
      video.play().catch(() => {});
      rampTo(volumeCeiling, 900);
    } else {
      rampTo(0, 420);
      setTimeout(() => { if (video && video.volume < 0.02) video.muted = true; }, 480);
    }
  }

  /* -- public ------------------------------------------------------------- */

  const API = {
    supported() { return setup(); },

    /** Tell the portal which world it leads to, before any transition starts.
        peek() runs on hover, long before open() is called, and without this it
        had no video to sample — the hover did nothing at all. */
    configure(config) {
      config = config || {};
      if (config.video)  video  = config.video;
      if (config.origin) origin = config.origin;
      if (config.volume != null) volumeCeiling = config.volume;
      if (video) video.volume = Math.min(video.volume, volumeCeiling);
      return setup();
    },

    /** Partial opening, for hover. Shows the world through a small tear. */
    peek(on) {
      if (!setup() || !video) return;
      canvas.classList.add("is-live");
      target = on ? 0.18 : 0;
      if (on) { video.play().catch(() => {}); sound(true); }
      else    { sound(false); }
      start();
    },

    /** Full transition. Resolves when the world covers the viewport. */
    open(config) {
      config = config || {};
      video  = config.video  || video;
      origin = config.origin || origin;
      volumeCeiling = config.volume == null ? volumeCeiling : config.volume;
      hooks = config;

      if (!setup() || !video) { config.onEnter?.(); return; }

      canvas.classList.add("is-live");
      video.play().catch(() => {});
      sound(true);
      entered = false;

      // Wait for a decodable frame before growing the tear. Over a network the
      // file is still buffering when the pointer arrives, and opening onto an
      // empty texture is what made the transition look like nothing happened.
      if (video.readyState >= 2) {
        target = 1;
      } else {
        target = 0.18;                       // hold the peek open meanwhile
        const go = () => { target = 1; };
        video.addEventListener("loadeddata", go, { once: true });
        setTimeout(go, 1800);                // never wait forever
      }
      start();

      // Safety net. The handover is driven by real progress, which is driven
      // by requestAnimationFrame — and rAF does not run in a backgrounded or
      // throttled renderer. Without this, a stalled loop leaves the visitor in
      // a half-open portal with audio playing, no interface and no way back.
      // Generous enough never to pre-empt a healthy transition.
      clearTimeout(API._t);
      API._t = setTimeout(() => {
        if (target === 1 && !entered) {
          entered = true;
          progress = 1;              // land it rather than freezing part-open
          hooks.onEnter?.();
        }
      }, 2600);
    },

    /** Reverse it. The world contracts back into the tear and vanishes. */
    close() {
      clearTimeout(API._t);
      entered = false;
      hooks.onExit?.();
      target = 0;
      sound(false);
      if (!ready) return;
      canvas.classList.add("is-live");
      start();
      API._t = setTimeout(() => { if (target === 0) stop(); }, 1400);
    },

    /** Called by app.js so a hidden tab does not keep a video decoding. */
    suspend() {
      if (video) { video.pause(); rampTo(0, 120); }
      stop();
    },

    isOpen() { return target === 1; }
  };

  window.EDGE_PORTAL = API;
})();
