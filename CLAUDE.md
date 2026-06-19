# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun install            # install dependencies (uses global ~/.bun cache — do NOT point the cache into the project)
bun run type-check     # TypeScript type checking (tsc --noEmit)
bun run lint           # ESLint over .ts files
bun run lint:fix       # ESLint with auto-fix
bun run test           # run tests once (vitest --run)
bun run test:watch     # run tests in watch mode
bun run validate       # test + lint + type-check (CI gate)
bun run offline        # run locally with serverless-offline (loads .env.dev)
bun run deploy:dev     # deploy to dev stage (loads .env.dev)
bun run deploy:sandbox # deploy to sandbox stage (loads .env.sandbox)
bun run remove:dev     # tear down the dev stack
bun run clean          # remove .serverless, coverage, .esbuild
```

Run a single test file:

```bash
bun run test src/functions/hello-world.test.ts
```

## Toolchain

- **Package manager: Bun** (pinned to the dev-bootstrap SOE version). Never reintroduce npm/yarn
  scripts or lockfiles. The lockfile is `bun.lock`.
- **Node 24** everywhere — local tooling/tests (`.nvmrc`, `engines`) and the deployed **Lambda
  runtime** (`nodejs24.x`). Controlled by the `NODE_RUNTIME` env var in `serverless.ts`; the esbuild
  target is derived from it. Override to `nodejs22.x` only if a region lacks `nodejs24.x`.
- **Serverless Framework v3** + `serverless-esbuild`. Stay on v3 (license-free).

## Architecture

A Serverless Framework (TypeScript) template deployed to AWS. It ships one sample Lambda,
`hello-world`, that exercises the common integrations a real service needs.

### Data flow

```
HTTP client
  → GET /hello (API Gateway HTTP API)
  → Lambda: helloWorld
      → Secrets Manager: getSecretJson(APP_SECRET_NAME)      # greeting
      → DynamoDB:        getItemById(ITEMS_TABLE_NAME, "hello")
      → Amazon Connect:  describeConnectInstance(CONNECT_INSTANCE_ID)  # only if set
  → JSON response
```

### Key design decisions

- **Thin handlers, testable lib.** `src/functions/*` are thin; all AWS calls and logic live in
  `src/lib/*` so they can be unit-tested in isolation. Handler tests mock `lib/`; lib tests mock the
  AWS SDK with `aws-sdk-client-mock`.
- **Per-function least-privilege IAM.** `serverless-iam-roles-per-function` gives each Lambda its own
  role. `helloWorld` may only `GetSecretValue` on its secret, `GetItem` on its table, and
  `DescribeInstance` on Connect. There is no shared account-wide role.
- **Fail soft.** Each integration is wrapped so a missing/unseeded resource degrades to a default
  instead of erroring — a fresh deploy is immediately testable.
- **Secrets never in source.** `resources/secrets-manager.ts` defines the secret container only; the
  value is seeded out of band.

### Module layout

| Path | Purpose |
|------|---------|
| `serverless.ts` | Serverless config — functions, per-function IAM, HTTP API, esbuild, runtime |
| `resources/dynamodb.ts` | DynamoDB table definition + exported table name |
| `resources/secrets-manager.ts` | Secret definition + exported secret name |
| `src/functions/hello-world.ts` | Sample Lambda handler (thin) |
| `src/lib/secrets.ts` | `getSecretJson` — Secrets Manager wrapper |
| `src/lib/dynamodb.ts` | `getItemById` — DynamoDB DocumentClient wrapper |
| `src/lib/connect.ts` | `describeConnectInstance` — Amazon Connect wrapper |
| `src/lib/env.ts` | `requireEnv` / `optionalEnv` |
| `src/lib/response.ts` | HTTP JSON response helper |
| `src/constants/index.ts` | Shared constants |
| `src/types/index.ts` | Shared TypeScript interfaces |
| `test/setupBeforeEach.ts` | Vitest global env stubs |

## Deployment

CI (`.github/workflows/ci.yml`) runs lint + type-check + test on PRs and pushes to `main`.
Deployment (`.github/workflows/deploy.yml`) is manual (`workflow_dispatch`), targets a GitHub
Environment, and assumes `AWS_DEPLOY_ROLE_ARN` via **OIDC** — no static AWS keys.

For local deploys use AWS SSO, then `bun run deploy:dev`. See README for seeding the sample secret
and DynamoDB item.

## Conventions for changes

- Keep handlers thin; put AWS/logic in `lib/` with matching `*.test.ts`.
- Every new function needs its own scoped `iamRoleStatements` in `serverless.ts`.
- Keep `bun run validate` green before finishing.
