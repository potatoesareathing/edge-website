# Using a plain chatbot to format content

You do not need an AI that can edit files. Any chatbot in a browser can do the
tedious part — turning a spreadsheet or a WhatsApp message into correctly
formatted entries — and you paste the result in yourself.

**The rule: the AI writes the block, you place the block, the checker verifies it.**

```bash
node scripts/check-content.js      # after every edit, before every commit
```

If the checker is happy, you cannot have broken the site. If it is not, it tells
you which line and why.

---

## How to place a block

1. Open `js/content.js` in an editor (VS Code is worth installing — it underlines
   a missing comma as you type).
2. Find the section you are replacing — the templates below say exactly what to
   search for.
3. Select from the opening `[` to the closing `]` and paste over it.
4. Save, then run the checker.
5. If something is wrong and you cannot see it:
   `git checkout -- js/content.js` throws away your change and puts the file
   back as it was. Nothing is lost except the edit.

---

## Template 1 — Leaderboard

Search `js/content.js` for `leaderboard: [`

> I have a website whose content lives in a JavaScript object. I need you to
> format some data into that exact structure. Do not change the structure, do
> not add fields, do not remove fields. Output only the code block, no
> explanation.
>
> The format is a JavaScript array. Each row looks exactly like this:
>
> ```js
> { ign: "ZENITH", name: "Rahul Menon", game: "Valorant", points: 1420, w: 18, l: 6, move: 2 },
> ```
>
> Rules:
> - `ign` is the player's in-game tag, `name` is their real name. Both are text
>   in double quotes.
> - `game` must be one of: Valorant, BGMI, Counter-Strike 2, EA FC, Chess,
>   Rocket League.
> - `points`, `w` (wins), `l` (losses) and `move` are numbers with NO quotes.
> - `move` is the change in league position since the last update: positive
>   means they climbed, negative means they dropped, 0 means no change.
> - Every row ends with a comma except the last one.
> - If a name contains an apostrophe, keep the double quotes so it is safe.
> - Order the rows the way they should appear on the page — highest points first
>   unless I say otherwise.
>
> Here is my data:
>
> [PASTE YOUR SPREADSHEET OR LIST HERE]

Then replace everything between `leaderboard: [` and its closing `]`.

---

## Template 2 — Roster

Search for `rosters: [`

> I have a website whose content lives in a JavaScript object. Format my data
> into this exact structure. Output only the code block.
>
> ```js
> {
>   game: "Valorant", name: "EDGE Valorant", format: "5v5 Tactical Shooter", status: "active",
>   players: [
>     { ign: "ZENITH", name: "Rahul Menon", role: "Duelist" },
>     { ign: "KAVI",   name: "Kavya S",     role: "Controller" }
>   ]
> },
> ```
>
> Rules:
> - `status` must be exactly `"active"` or `"recruiting"`. Use `"recruiting"`
>   with `players: []` for a team we are still forming.
> - `format` is a short description like "5v5 Tactical Shooter" or
>   "Squad Battle Royale".
> - Every value is text in double quotes.
> - Commas between entries, none after the last one.
>
> Here is my data:
>
> [PASTE HERE]

---

## Template 3 — Events and deadlines

Search for `updates: [`

> Format my data into this exact structure. Output only the code block.
>
> ```js
> {
>   kind: "deadline",
>   pinned: true,
>   title: "BGMI tryouts — registration closes",
>   date: "2026-10-12",
>   time: "23:59",
>   venue: "Main Campus",
>   body:  "Submit the Join form on the Roster path before this closes."
> },
> ```
>
> Rules:
> - `kind` must be exactly one of: `"deadline"`, `"event"`, `"announcement"`,
>   `"result"`.
> - `date` must be `YYYY-MM-DD`. This is not optional — any other format breaks
>   the countdown and may archive the event immediately.
> - `time` is optional, 24-hour `HH:MM`.
> - `pinned` and `venue` are optional. `pinned: true` floats it to the top.
> - `body` is one or two plain sentences.
>
> Here is my data:
>
> [PASTE HERE]

---

## Template 4 — FAQ answers

Search for `entries: [`

> Format my questions and answers into this exact structure. Output only the
> code block.
>
> ```js
> {
>   q: "How do I join?",
>   a: "Fill in the Join form. Pick Member for events and socials, or Roster to try out for a team.",
>   keywords: ["join", "sign", "signup", "register", "apply", "become", "entry"]
> },
> ```
>
> Rules:
> - `q` is the question as a visitor would ask it.
> - `a` is the answer in one or two plain sentences. It is shown exactly as
>   written — no markdown, no formatting, no links.
> - `keywords` is the important part. It is how a simple matcher decides which
>   answer to give, so include the words people ACTUALLY type: slang,
>   abbreviations, common misspellings, and singular and plural forms.
>   Aim for 6–12 per entry.
> - Do NOT include generic words like "what", "how", "the", "is" — they are
>   already filtered out and would make this answer match everything.
> - Avoid reusing the same keyword across many entries, or one answer starts
>   swallowing unrelated questions.
>
> Here are my questions and answers:
>
> [PASTE HERE]

---

## Template 5 — Blog posts

Search for `blog: [`

> Format my data into this exact structure. Output only the code block.
>
> ```js
> {
>   type:  "post",
>   title: "Valorant tryouts — day two",
>   date:  "2026-10-04",
>   tag:   "Events",
>   media: "assets/blog/tryouts-day2.jpg",
>   alt:   "Players at the tryouts, seated at the lab machines",
>   body:  "Twenty-two players across four hours.",
>   credit: "Ananya R"
> },
> ```
>
> Rules:
> - `date` must be `YYYY-MM-DD`.
> - `media` is a path to a file that must already exist in `assets/blog/`.
>   Leave it as `""` for a text-only post.
> - `alt` describes the image for someone who cannot see it. Required whenever
>   there is an image.
> - `tag` creates a filter button automatically. Keep tags consistent.
> - `credit` is optional.
>
> [PASTE HERE]

---

## What the chatbot will get wrong

Check these yourself. They are the mistakes every model makes with this format:

| Mistake | What it looks like | Why it matters |
|---|---|---|
| Quoting numbers | `points: "1420"` | Should be `points: 1420`. The checker catches this. |
| Smart quotes | `name: "Rahul"` with curly quotes | Copied from a document. Breaks the file. Retype the quotes. |
| Trailing comma after the last entry | `…move: 0 },\n]` | Usually tolerated, but do not rely on it. |
| Wrong date format | `date: "12/10/2026"` | Silently archives the event. The checker catches this. |
| Inventing fields | `points: 1420, rank: "Gold"` | Extra fields are ignored, so it fails silently rather than loudly. |
| Markdown in an answer | `a: "Go to **Join**"` | The asterisks are shown literally. Answers are plain text. |

The checker catches most of these. It cannot catch smart quotes reliably, so if
you pasted from Word or Google Docs and something looks odd, retype the quote
characters by hand.

---

## Never paste these into a chatbot

- The **service_role** key from Supabase. It bypasses all security.
- Real student data — names, phone numbers, register numbers, emails. Format the
  *structure* with fake data, then fill in the real values yourself.

The anon key is fine; it is published in your page source anyway.
