/* ============================================================================
   EDGE — THE MARK IN DEPTH
   ----------------------------------------------------------------------------
   The ghost on the homepage becomes an object rather than a picture. Scroll
   moves the camera through it, the cursor turns it, and it is lit from
   wherever the pointer is.

   HOW IT IS 3D WITHOUT ANY 3D

   Turning the mark's outline into real geometry would mean triangulating an
   SVG path, which is a genuine algorithm and a library's worth of code. It
   is also unnecessary. The mark is one silhouette, so drawing that same
   silhouette twenty-eight times at increasing depth produces a solid
   extrusion: the layers are hidden behind one another except at the edges,
   which is exactly what the side of an extruded shape looks like.

   Each layer is darker than the one in front of it, so the object shades
   itself. Thirty textured quads is nothing for a GPU -- this costs far less
   than the video it sits in front of.

   RAW WEBGL, DELIBERATELY

   Three.js would do this in fewer lines and cost ~600 KB, which is three
   times the entire rest of this site and would be its first dependency ever.
   Everything needed here is one perspective matrix, two rotations and a
   translation: about forty lines of arithmetic that will never need updating.

   DEGRADING

   If WebGL is missing, or the visitor asked for reduced motion, this never
   runs and the ordinary <img> of the mark stays exactly where it was. The
   canvas is only revealed once there is something drawn in it, so a failure
   is invisible rather than a hole in the page.
   ========================================================================== */

(function () {
  "use strict";

  const LAYERS = 28;        // silhouettes stacked to make the extrusion
  const DEPTH  = 0.30;      // total thickness in world units

  const VERT = `
    attribute vec2 aPos;
    uniform mat4  uProj;
    uniform mat4  uView;
    uniform float uZ;
    varying vec2  vUv;
    void main() {
      vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);   // flip: texture origin is top-left
      gl_Position = uProj * uView * vec4(aPos, uZ, 1.0);
    }`;

  const FRAG = `
    precision mediump float;
    uniform sampler2D uTex;
    uniform float uShade;     // 1 at the front face, darker toward the back
    uniform float uAlpha;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(uTex, vUv);
      if (t.a < 0.02) discard;                 // outside the silhouette
      gl_FragColor = vec4(t.rgb * uShade, t.a * uAlpha);
    }`;

  /* -- the smallest matrix library that does this job --------------------- */

  function perspective(fovyRad, aspect, near, far) {
    const f = 1 / Math.tan(fovyRad / 2), nf = 1 / (near - far);
    return [f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, 2 * far * near * nf, 0];
  }

  function multiply(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
                       a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }

  const translation = (x, y, z) =>
    [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];

  function rotationY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];
  }

  function rotationX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];
  }

  /* -- boot --------------------------------------------------------------- */

  function init() {
    const canvas = document.getElementById("heroMark");
    const fallback = document.querySelector(".home__mark");
    if (!canvas) return;

    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl = canvas.getContext("webgl", { alpha: true, antialias: true,
                                            premultipliedAlpha: false });
    if (!gl) return;                       // the <img> stays; nothing to do

    /* -- program -- */
    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("[hero3d] shader:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    /* -- one quad, reused for every layer -- */
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {};
    ["uProj","uView","uZ","uTex","uShade","uAlpha"]
      .forEach(n => { u[n] = gl.getUniformLocation(prog, n); });

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    /* -- the mark, rasterised from its own SVG -- */
    const tex = gl.createTexture();
    let ready = false;

    const img = new Image();
    img.onload = () => {
      // Rasterise at a fixed size rather than uploading the SVG directly:
      // an <img> of an SVG has no intrinsic pixel size until it is drawn.
      const S = 512;
      const off = document.createElement("canvas");
      off.width = S; off.height = S;
      const ctx = off.getContext("2d");
      const scale = Math.min(S / img.naturalWidth, S / img.naturalHeight) * 0.92;
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);

      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, off);

      ready = true;
      canvas.classList.add("is-live");          // reveal only once it can draw
      if (fallback) fallback.classList.add("is-replaced");
    };
    img.onerror = () => {};                     // the <img> simply stays
    img.src = "assets/edge-mark.svg?v=2";

    /* -- input -------------------------------------------------------------

       Two pointers into the same scene. Scroll is the camera: it dollies in
       and tips the object over as the hero leaves. The cursor is the turntable,
       and it is eased rather than followed, so the object has weight.          */

    let scroll = 0;                       // 0 at the top, 1 one viewport down
    let wantX = 0, wantY = 0;             // where the cursor is asking it to point
    let haveX = 0, haveY = 0;             // where it actually is

    function onScroll() {
      scroll = Math.min(window.scrollY / (window.innerHeight || 1), 1);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    function onPointer(e) {
      // Relative to the canvas, not the page: the object should look at the
      // pointer, not respond to where the window happens to be.
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      wantY = ((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)) * 0.55;
      wantX = ((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)) * 0.32;
    }
    window.addEventListener("pointermove", onPointer, { passive: true });

    // A touch device has no hovering cursor, so the turntable would sit dead
    // centre forever. Let a drag anywhere on the hero turn it instead.
    window.addEventListener("touchmove", e => {
      const t = e.touches && e.touches[0];
      if (t) onPointer(t);
    }, { passive: true });

    /* -- size --------------------------------------------------------------- */

    let dpr = 1;
    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      // Capped: past 2x the extra fragments buy nothing anyone can see on a
      // shape this size, and cost real frames on a phone.
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    }
    window.addEventListener("resize", resize, { passive: true });

    /* -- the loop ----------------------------------------------------------- */

    let raf = 0;
    let visible = true;

    // Stop drawing entirely once the hero has scrolled away, or the tab is
    // hidden, or another tab of the site is showing. A loop nobody can see is
    // pure battery.
    const io = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    }, { threshold: 0 });
    io.observe(canvas);

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && visible && !raf) raf = requestAnimationFrame(frame);
    });

    function frame(now) {
      raf = 0;
      if (!ready) { raf = requestAnimationFrame(frame); return; }
      if (!visible || document.hidden) return;      // resumed by the observer

      resize();
      if (!canvas.width) { raf = requestAnimationFrame(frame); return; }

      // Ease toward the cursor. The object arrives late and settles, which is
      // what makes it feel like a thing rather than a readout of the mouse.
      haveX += (wantX - haveX) * 0.06;
      haveY += (wantY - haveY) * 0.06;

      const t = (now || 0) / 1000;
      const idle = Math.sin(t * 0.4) * 0.06;        // never completely still

      // SCROLL IS THE CAMERA. It starts back and comes forward as the hero
      // leaves, while the object tips away — you are moving past it, not
      // watching it animate.
      const camZ  = -3.05 + scroll * 1.5;
      const tipX  = haveX + scroll * 0.85;
      const spinY = haveY + idle + scroll * 1.25;

      const aspect = canvas.width / canvas.height;
      const proj = perspective(0.85, aspect, 0.1, 40);

      let view = translation(0, 0, camZ);
      view = multiply(view, rotationX(tipX));
      view = multiply(view, rotationY(spinY));

      gl.uniformMatrix4fv(u.uProj, false, new Float32Array(proj));
      gl.uniformMatrix4fv(u.uView, false, new Float32Array(view));
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(u.uTex, 0);

      // Fade the whole object out as the content surface rises over it, so it
      // never fights the text that is arriving.
      gl.uniform1f(u.uAlpha, Math.max(0, 1 - scroll * 1.35));

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Back to front, so the alpha blend stacks correctly.
      for (let i = LAYERS - 1; i >= 0; i--) {
        const k = i / (LAYERS - 1);                 // 0 front .. 1 back
        gl.uniform1f(u.uZ, -k * DEPTH);
        // The back of the object is in its own shadow. Not linear: most of
        // the darkening happens in the first few layers, which is where a
        // real edge turns away from the light.
        gl.uniform1f(u.uShade, 0.18 + 0.82 * Math.pow(1 - k, 1.7));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    raf = requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
