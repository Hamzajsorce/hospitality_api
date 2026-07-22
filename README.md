# Template Backend

Reusable Parse Server backend with examples for:

- Parse Server bootstrapping.
- Cloud Code functions.
- Express routes.
- Services and repositories.
- Validators, middleware, triggers, and jobs.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

## Deploy (Render)

This project uses `parse@6.1.1`, which supports Node **18–22** only. Render defaults to newer Node versions, so either:

- keep the repo `api/.nvmrc` file (`22`), or
- set the Render environment variable `NODE_VERSION=22`

Without that, installs fail with an engine mismatch on Node 24+.

Parse dashboard/API is mounted at `/parse`.
Custom REST routes are mounted at `/api`.

## Feature Pattern

For every feature, create:

- `src/cloud/functions/<feature>Functions.js`
- `src/services/<feature>Service.js`
- `src/repositories/<feature>Repository.js`
- `src/validators/<feature>Validator.js`
- optional `src/routes/<feature>Routes.js`

Cloud functions should stay thin. Put business rules in services and Parse query details in repositories.
