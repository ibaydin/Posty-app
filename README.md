# Little Press

A small, server-rendered Node.js blog. Posts are Markdown files in `posts/`; the home page lists them, individual pages render them, and the form creates new files in the same folder.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

1. Install dependencies: `npm install`
2. Start the app: `npm run dev` (auto-restarts when server files change) or `npm start`
3. Open `http://localhost:3000`

Set the `PORT` environment variable to use a different port.

## Writing posts

Use **Write a post** in the navigation to publish from the browser. New Markdown files are saved under `posts/` with title, excerpt, and date front matter. You can also add a `.md` file directly to that folder; for example, see `posts/a-sunday-without-a-plan.md`.

Supported Markdown includes headings, paragraphs, lists, links, blockquotes, and emphasis. Rendered HTML is sanitized before it is served.

## Project layout

- `server.js` — Express routes, Markdown loading, sanitization, and post creation
- `posts/` — Markdown content
- `views/` — EJS templates
- `public/styles.css` — responsive visual styles
