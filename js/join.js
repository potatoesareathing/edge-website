/* ============================================================================
   EDGE — JOIN FORM
   ----------------------------------------------------------------------------
   Two paths in one form:
     Member — the light path. No tryout.
     Roster — everything Member asks, plus the competitive questions.

   Which fields are required changes with the path, so validation is driven by
   a rule table rather than by the `required` attribute in the HTML.

   Submissions go to Supabase. See README, "Turning the form on".
   ========================================================================== */

(function () {
  "use strict";

  const C = typeof EDGE !== "undefined" ? EDGE : null;
  if (!C) return;

  const J = C.join || {};
  const form = document.getElementById("joinForm");
  if (!form) return;

  const byId = id => document.getElementById(id);
  const QUEUE_KEY = "edge_join_queue";

  let path = "member";          // "member" | "roster"

  /* ------------------------------------------------------------ build ---- */

  function option(value, text) {
    const o = document.createElement("option");
    o.value = value;
    o.textContent = text;
    return o;
  }

  /** Rebuilds rather than appends, so running twice cannot double the list. */
  function fillSelect(id, items, placeholder) {
    const sel = byId(id);
    if (!sel) return;
    sel.replaceChildren(option("", placeholder), ...items.map(v => option(v, v)));
  }

  function buildChecks(boxId, values, name) {
    const box = byId(boxId);
    if (!box) return;
    box.replaceChildren(...values.map(v => {
      const label = document.createElement("label");
      label.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = name;
      input.value = v;
      const span = document.createElement("span");
      span.textContent = v;
      label.append(input, span);
      return label;
    }));
  }

  function applyCopy() {
    const set = (id, text) => { const n = byId(id); if (n) n.textContent = text || ""; };
    set("joinHeading", J.heading);
    set("joinIntro",   J.intro);
    set("memberLabel", J.paths?.member?.label);
    set("memberBlurb", J.paths?.member?.blurb);
    set("rosterLabel", J.paths?.roster?.label);
    set("rosterBlurb", J.paths?.roster?.blurb);
  }

  /* ----------------------------------------------------------- paths ----- */

  function setPath(next) {
    path = next;
    byId("pathValue").value = next;

    document.querySelectorAll(".path").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.path === next)));

    const roster = byId("rosterFields");
    const member = byId("memberFields");
    if (roster) roster.hidden = (next !== "roster");
    if (member) member.hidden = (next !== "member");

    // Clear errors belonging to the path we just left, so a hidden field can
    // never block submission with a message nobody can see.
    Object.keys(RULES).forEach(name => {
      if (!requiredNow(name)) showError(name, "");
    });
  }

  /* ------------------------------------------------------- validation ---- */

  const RULES = {
    fullName(v) {
      if (!v) return "Enter your full name.";
      if (v.length < 2) return "That name looks too short.";
      if (!/^[\p{L}\s.'-]+$/u.test(v)) return "Letters only, please.";
      return "";
    },
    registerNumber(v) {
      if (!v) return "Enter your register number.";
      // Deliberately permissive. TODO tighten once the RUAS format is confirmed.
      if (!/^[A-Za-z0-9/-]{4,20}$/.test(v)) return "That does not look like a register number.";
      return "";
    },
    branch(v) { return v ? "" : "Select your branch."; },
    year(v)   { return v ? "" : "Select your year."; },
    phone(v) {
      const d = digits(v);
      if (!d) return "Enter your phone number.";
      if (!/^[6-9]\d{9}$/.test(d)) return "Enter a valid 10-digit mobile number.";
      return "";
    },
    email(v) {
      if (!v) return "Enter your email address.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "That email does not look right.";
      return "";
    },
    title(v) { return v ? "" : "Pick the title you are trying out for."; },
    ign(v)   { return v.trim() ? "" : "Enter your in-game name."; }
  };

  // Which fields must be filled in depends on the chosen path.
  const ROSTER_ONLY = new Set(["title", "ign"]);
  const requiredNow = name => (ROSTER_ONLY.has(name) ? path === "roster" : true);

  function digits(v) {
    return String(v).replace(/[\s()-]/g, "").replace(/^(\+91|91|0)/, "");
  }

  function showError(name, message) {
    const input = byId(name);
    const slot  = byId("err-" + name);
    if (!input || !slot) return;

    slot.textContent = message;
    slot.classList.toggle("show", Boolean(message));
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", "err-" + name);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function validateField(name) {
    if (!requiredNow(name)) { showError(name, ""); return true; }
    const input = byId(name);
    if (!input) return true;
    const msg = RULES[name](input.value.trim());
    showError(name, msg);
    return !msg;
  }

  function validateAll() {
    let first = null;
    Object.keys(RULES).forEach(name => {
      if (!validateField(name) && !first) first = name;
    });
    if (first) byId(first).focus();
    return !first;
  }

  /* ---------------------------------------------------------- collect ---- */

  function collect() {
    const val = id => (byId(id)?.value || "").trim();
    const checked = name =>
      [...form.querySelectorAll('input[name="' + name + '"]:checked')].map(i => i.value);

    const row = {
      path:            path,
      full_name:       val("fullName"),
      register_number: val("registerNumber").toUpperCase(),
      branch:          val("branch"),
      year:            val("year"),
      phone:           digits(val("phone")),
      email:           val("email").toLowerCase(),
      interests:       path === "member" ? checked("interests") : [],
      game:            path === "roster" ? val("title") : null,
      ign:             path === "roster" ? val("ign") : null,
      rank:            path === "roster" ? (val("rank") || null) : null,
      role:            path === "roster" ? (val("role") || null) : null,
      experience:      path === "roster" ? (val("experience") || null) : null,
      submitted_at:    new Date().toISOString()
    };
    return row;
  }

  /* ------------------------------------------------------------- send ---- */

  function config() {
    const b = J.backend || {};
    return { mode: b.mode || "demo", sb: b.supabase || {} };
  }

  async function send(row) {
    const { mode, sb } = config();

    if (mode === "supabase") {
      if (!sb.url || !sb.anon_key) {
        // Not a user error — the site owner has not pasted their keys yet.
        const e = new Error("Supabase is not configured yet (js/content.js -> join.backend.supabase).");
        e.unconfigured = true;
        throw e;
      }

      const res = await fetch(sb.url + "/rest/v1/" + (sb.table || "registrations"), {
        method: "POST",
        headers: {
          "apikey":        sb.anon_key,
          "Authorization": "Bearer " + sb.anon_key,
          "Content-Type":  "application/json",
          "Prefer":        "return=minimal"
        },
        body: JSON.stringify(row)
      });

      if (!res.ok) {
        if (res.status === 409) {
          const e = new Error("duplicate");
          e.duplicate = true;
          throw e;
        }
        const text = await res.text();
        throw new Error("Supabase responded " + res.status + ": " + text.slice(0, 140));
      }
      return;
    }

    console.log("[EDGE] Join submission (demo mode — nothing stored):", row);
    await new Promise(r => setTimeout(r, 500));
  }

  /* -------------------------------------------------- offline queueing --- */

  const queue = {
    read()      { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; } },
    write(list) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(list)); } catch {} },
    add(row)    { const l = this.read(); l.push(row); this.write(l); return l.length; }
  };

  /** Re-send anything that failed earlier. Runs on load and on reconnect. */
  async function flush() {
    const pending = queue.read();
    if (!pending.length) return;

    const { mode, sb } = config();
    if (mode === "supabase" && (!sb.url || !sb.anon_key)) return;   // still not set up

    const stuck = [];
    for (const row of pending) {
      try { await send(row); }
      catch (err) { if (!err.duplicate) stuck.push(row); }
    }
    queue.write(stuck);

    if (pending.length && !stuck.length) {
      console.log("[EDGE] " + pending.length + " queued registration(s) synced.");
    }
  }

  /* --------------------------------------------------------------- UI ---- */

  function status(message) {
    const box = byId("formStatus");
    if (!box) return;
    box.textContent = message || "";
    box.classList.toggle("show", Boolean(message));
  }

  function succeed(row) {
    const title = byId("successTitle");
    const body  = byId("successBody");
    const idbox = byId("successId");

    if (title) title.textContent = path === "roster" ? "Request received." : "You are in.";
    if (body)  body.textContent  = (J.success && J.success[path]) || "";
    if (idbox) idbox.textContent = [row.full_name, row.register_number].filter(Boolean).join("  ·  ");

    form.hidden = true;
    document.querySelector(".paths")?.setAttribute("hidden", "");
    const panel = byId("joinSuccess");
    if (panel) { panel.hidden = false; panel.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }

  /* ------------------------------------------------------------- wire ---- */

  function init() {
    applyCopy();
    fillSelect("branch", J.branches || [], "Select your branch");
    fillSelect("year",   J.years    || [], "Select your year");
    fillSelect("title",  J.titles   || [], "Select a title");
    buildChecks("interestChecks", J.interests || [], "interests");

    document.querySelectorAll(".path").forEach(btn =>
      btn.addEventListener("click", () => setPath(btn.dataset.path)));
    setPath("member");

    Object.keys(RULES).forEach(name => {
      const input = byId(name);
      if (!input) return;
      input.addEventListener("blur",   () => validateField(name));
      input.addEventListener("change", () => validateField(name));
      // Re-check while typing only once a field has already errored, so we do
      // not shout at someone halfway through their first attempt.
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") validateField(name);
      });
    });

    form.addEventListener("submit", async e => {
      e.preventDefault();
      status("");

      // Honeypot. A human never sees this field, so a value means a bot.
      // Show the normal success state rather than telling it it was caught.
      if (form.querySelector('input[name="company"]').value) {
        succeed({ full_name: "", register_number: "" });
        return;
      }

      if (!validateAll()) { status("Check the highlighted fields above."); return; }

      const btn = byId("joinSubmit");
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending…";

      const row = collect();

      try {
        await send(row);
        succeed(row);
      } catch (err) {
        if (err.duplicate) {
          showError("registerNumber", "This register number has already been used to join.");
          status("Looks like you have already signed up. Email us if that seems wrong.");
        } else {
          // Never lose a submission to a dropped connection or missing keys.
          const depth = queue.add(row);
          succeed(row);
          console.warn("[EDGE] Submission held for retry (" + depth + " queued):", err.message);
        }
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });

    flush();
    window.addEventListener("online", flush);

    // Loud, early warning for whoever is setting the site up.
    const { mode, sb } = config();
    if (mode === "supabase" && (!sb.url || !sb.anon_key)) {
      console.warn(
        "%c[EDGE] The join form is not connected yet.",
        "font-weight:bold",
        "\nPaste your Supabase URL and anon key into js/content.js -> join.backend.supabase." +
        "\nUntil then, submissions are saved in the browser and sent automatically once you do."
      );
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
