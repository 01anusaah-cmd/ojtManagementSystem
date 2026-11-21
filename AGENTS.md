# OJT Management System — Agent Instructions

## Project shape
- This is a small full-stack JavaScript project with no framework build step.
- `Frontend/` is a browser UI prototype. `Frontend/index.html` is the active entry page and currently contains the application script inline; `Frontend/script.js` is a separate duplicate/older implementation, and `Frontend/style.css` is shared styling.
- `Backend/` uses Node.js, Express 5, and Mongoose.
- `Backend/server.js` is the real server entry point; `Backend/index.js` is currently only a placeholder.
- The student REST API is mounted at `/api/students` from `Backend/routes/studentRoutes.js`. `Backend/models/Student.js` defines the Mongoose schema; `Backend/controllers/` is present but most route logic is currently inside the route file.

## Commands
- Install backend dependencies: `cd Backend && npm install`
- Run the API: `cd Backend && node server.js`
- Run with reload: `cd Backend && npx nodemon server.js`
- Serve the frontend: open `Frontend/index.html` directly or use VS Code Live Server.
- Tests are not configured. `Backend/package.json` has no test script, and there is currently no frontend test runner.

## Backend conventions
- Preserve CommonJS syntax (`require` / `module.exports`).
- Keep Express JSON parsing and route mounting in `server.js` unless introducing a clearer app structure.
- Validate route parameters with `mongoose.isValidObjectId` before Mongoose lookups.
- Use meaningful HTTP statuses: `201` for creation, `400` for invalid input, `404` for missing records, and `500` for unexpected server failures.
- Add controller logic under `Backend/controllers/` only when refactoring routes to use it consistently; do not leave duplicate implementations split across routes and controllers.
- The server requires `MONGO_URI`; `PORT` defaults to `3000`. Do not commit `.env` files or database credentials.

## Frontend conventions
- When changing the rendered UI, confirm which frontend file is actually loaded: `index.html` currently links `style.css` and includes its own `<script>` block, while `script.js` is not referenced by that HTML.
- Avoid editing `index.html` and `script.js` as if they were the same source; keep both implementations synchronized only when the task explicitly requires that.
- Preserve the existing global-state pattern (`state`, `session`, `currentTab`, `activeModal`) and role-based rendering for coordinator and student views.
- Escape dynamic HTML with `esc(...)` before inserting values, and route display and mutation logic through existing `render*` / `bind*` helper pairs.
- Use the existing status vocabulary consistently: `approved`, `pending`, and `rejected`.

## Important integration and safety notes
- Frontend data is currently browser prototype state, persisted through `window.storage`; it is not yet the MongoDB student API source of truth.
- Demo passwords and authentication state are placeholder client-side data. Do not present them as secure production authentication.
- Before making architecture changes, first identify whether the task targets the prototype UI or the Express/MongoDB API and keep those flows clearly separated.
