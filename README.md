# Book Maker

Write, illustrate and share your own books — right in the browser.

**Live app:** https://josephsester.github.io/BookMaker/

## What it does

- **Bookshelf** — your books drawn as real books, saved privately in your browser.
- **New book** — title, author, and a choice of *Just words* (novels, memoirs, poetry) or *Words & pictures* (children's books).
- **Cover designer** — four cover layouts, title lettering, and a full color studio: hue wheel, shade diamond, RGB/HSB sliders, hex entry and palette presets.
- **Contents** — the real anatomy of a book (title page, copyright, dedication, epigraph, table of contents, foreword, preface, acknowledgements, chapters, epilogue, glossary, index, about the author and more). Write, skip, or remove any section — removed sections wait in a tray and slide back into their traditional spot.
- **Write** — a clean page editor with bold/italic/headings, picture upload, and a built-in drawing canvas.
- **Read** — a real two-page book with 3D page flips, automatic pagination, and a table of contents that numbers itself.
- **Share** — download the book as a standalone digital flipbook (.html) that opens anywhere, print/save a PDF, and back up or move your library as a file.

## Tech

Plain HTML, CSS and JavaScript — no build step, no backend. Books are stored in `localStorage`. Host it on any static server (it runs on GitHub Pages).

```
index.html
css/style.css
js/store.js   — data model, book anatomy catalog, storage
js/ui.js      — colors, cover renderer, color picker, pagination
js/app.js     — router, views, reader, share
```

## Run locally

Any static file server works, e.g.:

```
npx http-server -p 8123 .
```

Then open http://localhost:8123
