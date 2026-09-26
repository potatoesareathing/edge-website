# Documentation

**[EDGE-Website-Manual.pdf](EDGE-Website-Manual.pdf)** is the built manual — 79
pages covering the whole project: architecture, every subsystem, the maintenance
inventory, troubleshooting method, how to run the site without any AI
subscription, and the checklists. Read that one.

`manual.html` is its source.

The PDF is committed so the manual is readable straight from GitHub without a
build step. It is about 1.8 MB, so avoid regenerating it in every commit —
rebuild it when the content has actually changed.

It is assembled from the numbered files in `parts/`. Edit those, not `manual.html`.

## Rebuild

```bash
cd docs
cat parts/*.html > manual.html
```

## Regenerate the PDF

Needs Chrome. Adjust the path if yours differs.

```bash
"/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw --virtual-time-budget=12000 \
  --print-to-pdf="EDGE-Website-Manual.pdf" \
  "file:///C:/Users/aaliy/OneDrive/Desktop/EDGE-Website/docs/manual.html"
```

The page design lives in `parts/00-head.html`. Diagrams are inline SVG, so they
stay sharp at any zoom and are editable as text.

## The two scripts the manual refers to

Both live in `../scripts/` and neither needs an account or an internet
connection beyond the database check itself.

```bash
node scripts/check-content.js      # before every commit
bash scripts/verify-supabase.sh    # after any database change, and quarterly
```

`scripts/AI-PROMPT.md` holds prompt templates for formatting content with a
chatbot that cannot edit files.

## Keeping it true

The manual states line numbers from the commit it was written against. When you
change a subsystem, update the part that describes it in the same commit — a
manual that lies is worse than no manual.
