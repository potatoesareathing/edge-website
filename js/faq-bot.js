/* ============================================================================
   EDGE — FAQ ASSISTANT
   ----------------------------------------------------------------------------
   Answers questions from the knowledge base in content.js (EDGE.faq.entries).

   WHAT THIS IS, HONESTLY
   It is not an AI model. It is a matcher: it scores what someone typed against
   the keywords on each answer and returns the best one. That choice is
   deliberate - a real language model would need an API key, and a key shipped
   inside a public web page can be read by anyone viewing source and used to
   run up your bill. This version costs nothing, works with no internet, never
   invents an answer, and only ever says things you wrote.

   HOW THE MATCHING WORKS
     1. Lowercase the question and strip punctuation.
     2. Drop filler words ("the", "a", "can") that carry no meaning.
     3. Score every entry:
          + 2 for each remaining word that is one of its keywords
          + 1 for each remaining word that appears in its question text
          + 3 bonus if the typed text is nearly the whole question
     4. Divide by the square root of the word count, so a long rambling
        question does not automatically beat a short precise one.
     5. If the best score clears the confidence bar, answer. Otherwise say so
        honestly and offer the closest questions instead of guessing.

   TO IMPROVE AN ANSWER: edit EDGE.faq.entries in content.js. Add the words
   people actually type, including slang and misspellings.
   ========================================================================== */

(function () {
  "use strict";

  const FAQ = (typeof EDGE !== "undefined" && EDGE.faq) || null;
  if (!FAQ) return;

  const log      = document.getElementById("chatLog");
  const form     = document.getElementById("chatForm");
  const input    = document.getElementById("chatInput");
  const chipsBox = document.getElementById("chatChips");
  if (!log || !form || !input) return;

  /* -- language helpers --------------------------------------------------- */

  // Words that appear in almost every question and so say nothing about which
  // answer is wanted. Question words ("what", "how") are in here deliberately:
  // when they were treated as keywords, "what is the weather today" matched
  // "What is EDGE?" purely on the word "what".
  const FILLER = new Set([
    "the","a","an","of","to","for","in","on","at","and","or","but","if","then",
    "my","me","i","im","you","your","yours","we","us","our","it","its","this",
    "that","these","those","be","am","is","are","was","were","been","being",
    "will","would","shall","should","may","might","must","can","could","have",
    "has","had","having","do","does","did","doing","get","got","there","here",
    "with","into","from","as","by","so","just","really","actually","please",
    "hey","hi","hello","thanks","thank",
    "what","how","when","where","why","who","whom","whose","which","whats"
  ]);

  /**
   * A deliberately crude stemmer: enough to make "years" match "year" and
   * "casting" match "cast", without pulling in a linguistics library. Applied
   * to both sides of the comparison so they meet in the middle.
   */
  function stem(word) {
    if (word.length > 4) {
      if (word.endsWith("ies")) return word.slice(0, -3) + "y";
      if (word.endsWith("ing")) return word.slice(0, -3);
      if (word.endsWith("ed"))  return word.slice(0, -2);
      if (word.endsWith("es"))  return word.slice(0, -2);
    }
    if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
      return word.slice(0, -1);
    }
    return word;
  }

  const GREETINGS = new Set(["hi","hello","hey","yo","hola","namaste","sup","heya"]);
  const THANKS    = new Set(["thanks","thank","thx","ty","cheers"]);

  function tokenize(text) {
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")   // punctuation out
      .split(/\s+/)
      .filter(Boolean);
  }

  const meaningful = tokens =>
    tokens.filter(t => !FILLER.has(t) && t.length > 1).map(stem);

  /* -- matching ----------------------------------------------------------- */

  const CONFIDENCE_BAR = 1.4;

  function score(entry, words, raw) {
    const keywords   = new Set((entry.keywords || []).map(stem));
    const inQuestion = new Set(tokenize(entry.q).map(stem));

    let points = 0;
    // Count each distinct word once, so repeating a word cannot inflate a match.
    new Set(words).forEach(w => {
      if (keywords.has(w))   points += 2;
      if (inQuestion.has(w)) points += 1;
    });

    // Someone who typed almost the exact question should always land on it.
    const qNorm = tokenize(entry.q).join(" ");
    if (qNorm && raw.length > 6 && (qNorm.includes(raw) || raw.includes(qNorm))) {
      points += 3;
    }

    // Divide by the square root of the word count, not the count itself.
    // Dividing by the full count punished natural phrasing far too hard:
    // "i want to sign up" scored below a bare "join" because three of its
    // words carried no signal. The square root still stops a long rambling
    // question from beating a short precise one, but much more gently.
    return points / Math.sqrt(Math.max(words.length, 1));
  }

  function findAnswer(text) {
    const raw   = tokenize(text).join(" ");
    const words = meaningful(tokenize(text));

    if (!words.length) return { kind: "empty" };

    const ranked = FAQ.entries
      .map(entry => ({ entry, s: score(entry, words, raw) }))
      .sort((a, b) => b.s - a.s);

    if (!ranked.length || ranked[0].s < CONFIDENCE_BAR) {
      return {
        kind: "unsure",
        // Offer the nearest few, but only ones that scored at all.
        near: ranked.filter(r => r.s > 0).slice(0, 3).map(r => r.entry.q)
      };
    }
    return { kind: "answer", entry: ranked[0].entry };
  }

  /* -- rendering ---------------------------------------------------------- */

  function bubble(who, text) {
    const row = document.createElement("div");
    row.className = "msg msg--" + who;

    const body = document.createElement("div");
    body.className = "msg__body";
    body.textContent = text;          // never innerHTML - this is user-adjacent

    row.append(body);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  function typing() {
    const row = document.createElement("div");
    row.className = "msg msg--bot";
    const dots = document.createElement("div");
    dots.className = "msg__body msg__typing";
    dots.setAttribute("aria-label", "Typing");
    dots.append(dot(), dot(), dot());
    row.append(dots);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return row;

    function dot() { const s = document.createElement("span"); return s; }
  }

  function renderChips(list) {
    if (!chipsBox) return;
    chipsBox.replaceChildren(...list.map(q => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = q;
      b.addEventListener("click", () => ask(q));
      return b;
    }));
  }

  /* -- conversation ------------------------------------------------------- */

  let busy = false;

  function respond(text) {
    // A short pause before answering. Instant replies read as canned; this
    // gives the eye time to register that a new message arrived.
    const think = typing();
    busy = true;

    setTimeout(() => {
      think.remove();

      const words = meaningful(tokenize(text));
      const all   = tokenize(text);

      if (all.some(w => GREETINGS.has(w)) && words.length === 0) {
        bubble("bot", "Hello. " + FAQ.greeting);
        renderChips(FAQ.suggestions || []);
        busy = false;
        return;
      }

      if (all.some(w => THANKS.has(w)) && words.length <= 1) {
        bubble("bot", "Any time. Anything else?");
        busy = false;
        return;
      }

      const result = findAnswer(text);

      if (result.kind === "answer") {
        bubble("bot", result.entry.a);
        // Offer related questions, never repeating the one just answered.
        const others = FAQ.entries
          .map(e => e.q)
          .filter(q => q !== result.entry.q)
          .slice(0, 3);
        renderChips(others);
      } else if (result.kind === "unsure" && result.near.length) {
        bubble("bot", FAQ.fallback);
        renderChips(result.near);
      } else {
        bubble("bot", FAQ.fallback);
        renderChips(FAQ.suggestions || []);
      }

      busy = false;
    }, 420);
  }

  function ask(text) {
    const clean = String(text).trim();
    if (!clean || busy) return;
    bubble("me", clean);
    input.value = "";
    respond(clean);
  }

  /* -- static FAQ list ---------------------------------------------------- */

  /** The same answers as plain text underneath, so the page is still useful
      if someone never touches the chat - and so search engines can read it. */
  function renderList() {
    const box = document.getElementById("faqList");
    if (!box) return;

    box.replaceChildren(...FAQ.entries.map(e => {
      const item = document.createElement("details");
      item.className = "faq-item";

      const head = document.createElement("summary");
      head.textContent = e.q;

      const body = document.createElement("p");
      body.textContent = e.a;

      item.append(head, body);
      return item;
    }));
  }

  /* -- boot --------------------------------------------------------------- */

  form.addEventListener("submit", e => {
    e.preventDefault();
    ask(input.value);
  });

  bubble("bot", FAQ.greeting);
  renderChips(FAQ.suggestions || []);
  renderList();

  // Exposed so the Join tab can deep-link a question into the chat later.
  window.EDGE_ASK = ask;
})();
