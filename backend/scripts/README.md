# Backend scripts

Operational one-off commands live in this directory. For application setup and
migrations, see the [backend README](../README.md); for the scheduled data
retention policy, see the [retention README](../src/retention/README.md).

Run database scripts from the `backend` directory with the same database
environment variables as the application.

## `index-audit.js`

- **npm alias:** `npm run index-audit`
- **Direct command:** `node scripts/index-audit.js`
- **What it does:** Runs `EXPLAIN` for the three hot-path queries used by the
  credits statement, member payment list, and manual-review queue. It prints
  each plan and rejects a sequential scan on any of those queries.
- **Required environment:** `DATABASE_HOST`, `DATABASE_USERNAME`,
  `DATABASE_PASSWORD`, and `DATABASE_NAME`. `DATABASE_PORT` is optional and
  defaults to `5432`.
- **Data safety:** Read-only. It does not modify rows or schema.
- **When to run:** After `npm run migration:run`, against a freshly migrated
  local or disposable CI database. It is suitable as a pre-PR database check;
  do not point it at production.
- **Exit codes:** Exits `0` when all audited plans avoid `Seq Scan`. Exits `1`
  if any plan contains a sequential scan, or if connecting/querying fails.
  Connection and query errors therefore fail CI as well.

## Known package-script gap

`backend/package.json` also contains these aliases, but their target file is
not present in this branch:

- `npm run demo:seed` → `node scripts/demo-data.js seed`
- `npm run demo:clear` → `node scripts/demo-data.js clear`
- `npm run demo:info` → `node scripts/demo-data.js info`
- `npm run demo:validate` → `node scripts/demo-data.js validate`

There is no runnable `demo-data.js` here, so its environment, mutation
semantics, and exit behavior cannot be documented from this branch. Each alias
currently fails before doing any work with Node's missing-module error; restore
or remove the script before relying on any of these commands.
