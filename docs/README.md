# Documentation

`manual.html` is the source of **The EDGE Website Owner's Manual** — a 73-page
technical manual covering the whole project: architecture, every subsystem, the
maintenance inventory, troubleshooting method, and the checklists.

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

## Keeping it true

The manual states line numbers from the commit it was written against. When you
change a subsystem, update the part that describes it in the same commit — a
manual that lies is worse than no manual.
