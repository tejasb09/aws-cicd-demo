# nn-aws-cicd-demo

> Bootstrapped from the [aws-serverless-template](git@github.com:cloudwave-solutions/aws-serverless-template.git) template.

Toolchain and architecture docs inherited from the template follow.

---

# AWS Serverless Template

An opinionated **Serverless Framework + TypeScript** starter for shipping AWS Lambda services fast.
Pull it, rename it, deploy it.

It ships a single `hello-world` Lambda that demonstrates the four things almost every service needs:

1. **API Gateway trigger** — HTTP API `GET /hello`.
2. **Secrets Manager** — reads an application secret at runtime.
3. **DynamoDB** — reads an item by primary key.
4. **Amazon Connect** — makes a (read-only) AWS service API call (`DescribeInstance`).

Everything is wired with **least-privilege, per-function IAM**, unit tests, linting, type-checking,
git hooks, and CI/CD via GitHub Actions.

---

## Stack / toolchain

| Concern | Choice |
| --- | --- |
| Runtime (local tooling & tests) | **Node.js 24** (see `.nvmrc`) |
| Package manager | **Bun 1.3.14** (matches the [dev bootstrap SOE](../solutions-dev-bootstrap)) |
| IaC / deploy | **Serverless Framework v3** + `serverless-esbuild` |
| Lambda runtime | `nodejs24.x` (matches local Node 24) — see [Node runtime note](#a-note-on-the-lambda-runtime) |
| Per-function IAM | `serverless-iam-roles-per-function` |
| Local emulation | `serverless-offline` |
| Tests | **Vitest** (+ `aws-sdk-client-mock`) |
| Lint / format | ESLint + Prettier |
| Git hooks | Husky (lint on commit, full validate on push) |

> This template assumes you ran the **solutions-dev-bootstrap** so that `bun` and Node 24 (via `fnm`)
> are already on your machine. If not, run that first.

---

## Quick start

```bash
# 1. Clone and rename
git clone <this-repo-url> my-service
cd my-service

# 2. Use Node 24 (if you use fnm/nvm)
fnm use            # or: nvm use   (reads .nvmrc)

# 3. Install dependencies (Bun)
bun install

# 4. Run the test suite + lint + type-check
bun run validate

# 5. Configure your environment
cp .env.example .env.dev
#   edit .env.dev — set SERVICE_NAME, STAGE, AWS_REGION, (optional) CONNECT_INSTANCE_ID

# 6. Run locally (no AWS deploy)
bun run offline
#   then: curl http://localhost:3000/hello
```

> **Heads up about the Bun cache:** `bun install` uses a global cache under `~/.bun` by default —
> leave it there. Do **not** point `BUN_INSTALL_CACHE_DIR` inside the project directory.

---

## Available commands

```bash
bun install            # install dependencies
bun run type-check     # tsc --noEmit
bun run lint           # eslint over .ts files
bun run lint:fix       # eslint with --fix
bun run format         # prettier --write
bun run test           # vitest --run (one-shot)
bun run test:watch     # vitest in watch mode
bun run validate       # test + lint + type-check  (the CI gate)
bun run offline        # run locally via serverless-offline (loads .env.dev)
bun run deploy:dev     # deploy to the dev stage     (loads .env.dev)
bun run deploy:sandbox # deploy to the sandbox stage (loads .env.sandbox)
bun run remove:dev     # tear down the dev stack
bun run clean          # remove .serverless, coverage, .esbuild
```

Run a single test file:

```bash
bun run test src/functions/hello-world.test.ts
```

---

## Deploy end to end

### 1. Authenticate to AWS

Using AWS SSO (recommended for local deploys):

```bash
aws sso login --profile my-profile
eval "$(aws configure export-credentials --profile my-profile --format env)"
```

### 2. Configure your stage

```bash
cp .env.example .env.dev
```

Edit `.env.dev`:

| Variable | Purpose |
| --- | --- |
| `SERVICE_NAME` | Stack name prefix — all resources derive from this. |
| `STAGE` | `dev`, `sandbox`, `prod`, ... |
| `AWS_REGION` | e.g. `ap-southeast-2`. |
| `CONNECT_INSTANCE_ID` | Optional. If set, the Lambda calls `connect:DescribeInstance` on it. Leave blank to skip. |

### 3. Deploy

```bash
bun run deploy:dev
```

Serverless prints stack outputs, including **`HelloWorldUrl`**. Test it:

```bash
curl "$HELLO_WORLD_URL"
```

You'll get something like:

```json
{
  "service": "nn-aws-cicd-demo",
  "stage": "dev",
  "greeting": "Hello, world!",
  "item": null,
  "connectInstance": null
}
```

### 4. Seed the sample backing data (optional)

The endpoint works immediately and **fails soft** — a missing secret or item just falls back to
defaults. To see live data flow through, seed them:

```bash
# A custom greeting in the app secret
aws secretsmanager put-secret-value \
  --secret-id "<SERVICE_NAME>-dev-app" \
  --secret-string '{"greeting":"Hello from Secrets Manager!"}'

# A sample item in DynamoDB (primary key id = "hello")
aws dynamodb put-item \
  --table-name "<SERVICE_NAME>-dev-items" \
  --item '{"id":{"S":"hello"},"message":{"S":"Hi from DynamoDB"}}'
```

Re-run the `curl` — `greeting`, `item`, and (if `CONNECT_INSTANCE_ID` is set) `connectInstance`
now reflect live data.

### 5. Tear down

```bash
bun run remove:dev
```

---

## Project layout

```
.
├── serverless.ts                # Serverless config: functions, per-function IAM, HTTP API, esbuild
├── resources/
│   ├── dynamodb.ts              # DynamoDB table definition + exported table name
│   └── secrets-manager.ts       # Secret definition + exported secret name
├── src/
│   ├── functions/
│   │   ├── hello-world.ts       # The sample Lambda handler (thin — delegates to lib/)
│   │   └── hello-world.test.ts  # Handler unit tests (lib mocked)
│   ├── lib/
│   │   ├── secrets.ts           # getSecretJson — Secrets Manager wrapper
│   │   ├── dynamodb.ts          # getItemById — DynamoDB DocumentClient wrapper
│   │   ├── connect.ts           # describeConnectInstance — Amazon Connect wrapper
│   │   ├── env.ts               # requireEnv / optionalEnv
│   │   ├── response.ts          # HTTP JSON response helper
│   │   └── *.test.ts            # lib unit tests (AWS SDK mocked via aws-sdk-client-mock)
│   ├── constants/index.ts       # Shared constants
│   └── types/index.ts           # Shared TypeScript interfaces
├── test/setupBeforeEach.ts      # Vitest global env stubs
└── .github/workflows/           # CI (validate) + Deploy (OIDC)
```

**Design rules this template follows:**

- **Thin handlers.** `src/functions/*` parse input, call `src/lib/*`, shape the response. Business
  logic and AWS calls live in `lib/` so they're independently testable.
- **Least-privilege IAM.** Every function gets its own role via `serverless-iam-roles-per-function`,
  scoped to exactly the secret / table / instance it touches. There is **no** account-wide role.
- **Fail soft.** The sample degrades gracefully when its backing resources aren't seeded yet, so a
  fresh deploy is immediately testable.
- **Secrets are never in source.** Resource definitions create the *secret container*; you seed the
  *value* out of band (CLI, console, or a separate pipeline).

---

## Adapting this template

1. Rename the service in `package.json` (`name`) and `.env.*` (`SERVICE_NAME`).
2. Replace `hello-world` with your real function(s) in `src/functions/` and register them in
   `serverless.ts`, each with its own `iamRoleStatements`.
3. Rename/extend the resources in `resources/`.
4. Update `.github/CODEOWNERS`.
5. Keep `bun run validate` green — it's the CI gate.

---

## CI/CD

### `ci.yml` — runs on every PR and push to `main`

- Installs with `bun install --frozen-lockfile` (fails if `bun.lock` drifts from `package.json`).
- Runs lint, type-check, and tests as separate steps (clearer failure attribution).
- Cancels superseded runs on the same ref and uploads the coverage artifact.

### `deploy.yml` — manual (`workflow_dispatch`)

- Pick a **GitHub Environment**; its protection rules (required reviewers, wait timer) gate the deploy.
- Authenticates to AWS via **OIDC federation** — assumes `AWS_DEPLOY_ROLE_ARN` with short-lived
  credentials. **No long-lived AWS access keys are stored in GitHub.**

To wire up deploys, per environment in **Settings → Environments**:

- **Secret** `AWS_DEPLOY_ROLE_ARN` — the IAM role GitHub assumes via OIDC (see below).
- **Variables** `SERVICE_NAME`, `STAGE`, `AWS_REGION`, and optionally `CONNECT_INSTANCE_ID`,
  `NODE_RUNTIME`.

#### Creating the deploy role (`infra/github-oidc-role.yaml`)

A CloudFormation template ships with this repo to create the role GitHub assumes. Deploy it
**once per AWS account** (it also creates the account-wide GitHub OIDC provider):

```bash
aws cloudformation deploy \
  --template-file infra/github-oidc-role.yaml \
  --stack-name nn-aws-cicd-demo-github-oidc \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOrg=<your-org> \
    GitHubRepo=<your-repo> \
    GitHubEnvironment=<env-name> \
    ServiceNamePrefix=<SERVICE_NAME>
```

Then copy the `DeployRoleArn` stack output into the `AWS_DEPLOY_ROLE_ARN` environment secret.

The role's trust policy scopes **which repo/environment** may assume it (a repo + GitHub
Environment by default — **not** the whole org). Key parameters:

| Parameter | Default | Notes |
| --- | --- | --- |
| `GitHubOrg` | _(required)_ | The `owner` in `owner/repo`. |
| `GitHubRepo` | `*` | A repo name to scope tightly, or `*` for any repo in the org (broad). |
| `GitHubEnvironment` | `*` | A GitHub Environment to scope to, or `*` for any branch/env. |
| `CreateOIDCProvider` | `true` | Set to `false` if the account already has the GitHub OIDC provider. |
| `ServiceNamePrefix` | `nn-aws-cicd-demo` | Deploy permissions are scoped to `<prefix>-*` resources. |

---

## A note on the Lambda runtime

Both local tooling/tests and the deployed **Lambda runtime use Node 24** (`nodejs24.x`, set in
`serverless.ts`).

If you ever deploy into a region that doesn't yet offer `nodejs24.x`, override it without touching
code by setting an env/CI variable — the esbuild compile target is derived from it automatically:

```bash
NODE_RUNTIME=nodejs22.x bun run deploy:dev
```

---

## License

MIT
