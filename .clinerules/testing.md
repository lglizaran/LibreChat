# Testing Strategy – `api/`, `client/`, `e2e/`

This document describes the testing strategy for LibreChat across backend, frontend, and end‑to‑end layers.

## 1. Overview

- **Test Runners**
  - Backend: Jest (`api/jest.config.js`)
  - Frontend: Jest (`client/jest.config.cjs`, jsdom environment)
  - E2E: Playwright + Jest wrappers (`e2e/`)
- **Goals**
  - Protect core conversation/agent flows and auth
  - Enforce contracts between backend, frontend, and shared types
  - Catch regression in configuration, caching, and deployment‑critical logic

## 2. Backend Testing – `api/`

### 2.1 Jest Configuration

- `api/jest.config.js`
  - Root Jest config for backend tests
  - Sets Node test environment
  - Configures module paths and transforms
  - Points to `api/test/jestSetup.js` as global setup

### 2.2 Global Setup – `api/test/jestSetup.js`

Responsibilities:

- Initialize test environment variables (using `api/test/.env.test.example` as template)
- Set up DB/Redis test connections or mocks
- Register global utilities/mocks as needed

`.env.test.example` provides a reference for:

- Test database URI, name, user, password
- Redis host/port or local stub configuration
- Minimal provider API keys (often dummy values for tests)

### 2.3 Test Layout – `api/test/`

- `api/test/__mocks__/`
  - Manual mocks for:
    - External AI providers / HTTP clients
    - Email services
    - RAG API
    - Other network‑heavy dependencies
  - Used by Jest’s module mocking to avoid real external calls

- `api/test/app/`
  - Tests focused on:
    - `api/app/index.js` bootstrap behavior
    - Global middleware wiring
    - Integration of routes at a high level (smoke tests)

- `api/test/server/`
  - Route and middleware tests:
    - Auth flows: login, social callbacks
    - Conversation/message endpoints
    - Agents, presets, prompts HTTP APIs
    - Error and rate‑limit behavior

- `api/test/services/`
  - Tests for service modules:
    - Conversation orchestration flows
    - Token accounting & billing logic
    - Agent and tools orchestration
    - Caching and rate‑limit integration

### 2.4 Model‑Level Tests – `api/models/*.spec.js`

Many models have adjacent `*.spec.js` files validating:

- Schema behavior (required fields, defaults)
- Hooks (pre/post save, validation)
- Relationships between entities

Notable test files:

- `Agent.spec.js` – agent creation, capabilities, and permissions
- `Conversation.spec.js` / `convoStructure.spec.js` – tree structure, branching, merging
- `File.spec.js` – file metadata integrity and associations
- `Message.spec.js` – message tree, editing, resubmission behavior
- `Prompt.spec.js`, `PromptGroupMigration.spec.js` – prompt templates and migration invariants
- `Role.spec.js` – roles and permission constraints
- `Transaction.spec.js`, `tx.spec.js` – token transactions and accounting
- `spendTokens.spec.js` – token spending rules and edge cases

### 2.5 Strategy & Auth Tests – `api/strategies/*.test.js`

Files:

- `appleStrategy.test.js`
- `ldapStrategy.spec.js`
- `samlStrategy.spec.js`
- `openidStrategy.spec.js`
- `process.test.js`
- `socialLogin.test.js`
- `validators.spec.js`

Coverage:

- Strategy setup and provider profile handling
- Mapping external identities to internal users
- Error paths, invalid tokens, and rejected logins
- Input validation and normalization

### 2.6 Utility Tests – `api/utils/*.spec.js`

- `deriveBaseURL.spec.js`, `extractBaseURL.spec.js`
  - Validate URL derivation from proxy headers and config

Other utility tests ensure:

- Logging behavior
- Base URL extraction for links/redirects

## 3. Frontend Testing – `client/`

### 3.1 Jest Configuration – `client/jest.config.cjs`

- Uses `jsdom` test environment for browser‑like testing
- Configures:
  - TS/JSX transforms via Babel
  - Module alias resolution (e.g., `@/components/...`)
  - Optional setup files (for testing‑library, i18n, etc.)

### 3.2 Test Layout – `client/test/`

- Mirrors `client/src/` concepts:
  - Components, hooks, context, feature modules
- Test focus:
  - Conversation list & chat rendering
  - Composer behavior (model selection, tools toggles)
  - Agents, presets, prompts UIs
  - Image generation and code artifacts rendering
  - Auth flows and settings

Patterns:

- Use React Testing Library style:
  - `render`, `screen`, `userEvent`
- Prefer interaction‑focused tests over implementation details
- Mock API calls; do not hit live backend

### 3.3 Integration with Shared Types

- Tests rely on types from `packages/data-schemas` and `packages/api`:
  - Use realistic DTO structures for conversations/messages/agents
  - Avoid ad‑hoc shapes inconsistent with backend

## 4. End‑to‑End (E2E) Testing – `e2e/`

### 4.1 Structure

- `e2e/playwright.config.ts`
  - Base Playwright configuration (projects, timeouts, retries)
- `e2e/playwright.config.local.ts`
  - Local‑env specific config (baseURL, ports)
- `e2e/playwright.config.a11y.ts`
  - Accessibility‑focused configuration (axe, a11y scans)
- `e2e/config.local.example.ts`
  - Example config with local endpoints and credentials
- `e2e/types.ts`
  - Shared test types/interfaces
- `e2e/jestSetup.js`
  - Shared setup glue (if running via Jest)

Directories:

- `e2e/setup/`
  - Bootstrapping utilities:
    - Seed users/data
    - Environment pre‑checks (API ready, client reachable)
- `e2e/specs/`
  - Scenario tests:
    - Auth login/logout
    - Conversation creation and branching
    - Agent usage and tools invocation
    - File upload & code interpreter flows
    - Web search/RAG usage (if enabled)
    - Basic admin flows where available

### 4.2 Targeted Concerns

E2E tests verify:

- End‑to‑end correctness of UI + API integration
- Critical paths:
  - Logging in
  - Starting a conversation
  - Sending and receiving model responses
  - Switching models/agents
- Basic accessibility (e.g., via a11y config)

## 5. Shared Packages Testing – `packages/`

Although config files are not directly listed here, testing expectations:

- `packages/data-schemas/`
  - Schemas/types should be validated via unit tests where applicable
  - Contracts should stay backward‑compatible or be versioned

- `packages/api/`
  - Typed client utilities should be tested against representative API responses
  - Error‑handling logic (e.g., HTTP failures) should have test coverage

- `packages/client/`
  - Shared hooks/components used by the `client/` app should have unit tests here or in `client/test/`

## 6. Running Tests

### 6.1 Typical Commands (via root `package.json`)

Exact scripts may vary, but typical commands are:

- All tests:
  - `npm test`
- Backend tests only:
  - `npm run test:api` or `(cd api && npm test)`
- Frontend tests only:
  - `npm run test:client` or `(cd client && npm test)`
- E2E tests:
  - `npm run test:e2e` or `(cd e2e && npx playwright test)`

Check `package.json` and sub‑project `package.json` files for exact script names.

### 6.2 Test Environments

- **Backend unit/integration tests**
  - Use `.env.test` (based on `api/test/.env.test.example`)
  - May run against:
    - In‑memory DB
    - Local test DB & Redis
- **Frontend unit tests**
  - Pure jsdom; backend behavior mocked
- **E2E tests**
  - Require running backend + frontend + DB + Redis stack
  - Usually executed against local dev or docker‑compose environment

## 7. Best Practices for New Tests

1. **Place tests close to domain**
   - Models → `api/models/*.spec.js`
   - Services → `api/test/services/`
   - Routes/middleware → `api/test/server/`
   - Frontend components → `client/test/` mirroring `client/src/`
   - E2E flows → `e2e/specs/`

2. **Use shared types**
   - Prefer schemas/types from `packages/data-schemas` and `packages/api`
   - Keep request/response shapes aligned with backend

3. **Isolate external dependencies**
   - Use `api/test/__mocks__` for providers and network services
   - For frontend, mock HTTP clients or hooks

4. **Focus on behavior**
   - Test observable behavior (responses, UI, side effects)
   - Avoid brittle tests tied to implementation details

5. **Update `.clinerules/testing.md`**
   - When adding major suites or changing test strategy:
     - New test directories
     - New runners/configs
     - Significant changes in environment setup

## 8. CI Integration (Conceptual)

While actual CI configuration lives outside this repo (e.g., GitHub Actions):

- Typical pipeline stages:
  - Install dependencies
  - Lint (`eslint`)
  - Run backend unit/integration tests
  - Run frontend tests
  - Optionally run e2e tests (on tagged or main branches)
- Test failures should block merges to protected branches

This document should be kept in sync with any changes to Jest/Playwright configs or test layout to ensure a clear, up‑to‑date testing strategy.
