# Backend Architecture – `api/`

This document describes the backend architecture of LibreChat, implemented in the `api/` directory. It is intended as a reference for future development and refactoring.

## 1. Overview

- **Runtime:** Node.js (JavaScript)
- **Framework:** Express
- **Primary Responsibilities:**
  - HTTP API and WebSocket endpoints for the client
  - Authentication & authorization (local and multiple SSO strategies)
  - Conversation, message, presets, prompts, agents, and file management
  - Token accounting, transactions, and moderation
  - Routing of chat requests to external AI providers
  - Caching, rate limiting, and abuse detection
  - Integration with RAG and web search components

Core layout:

- `api/app/` – App bootstrap and client integrations
- `api/server/` – Express server, routing, controllers, middleware, services, utilities
- `api/models/` – Database models and associated business logic
- `api/db/` – Database connection and model registration
- `api/cache/` – Redis-based caching & violation handling
- `api/strategies/` – Auth strategies (local, OAuth, LDAP, SAML, JWT, etc.)
- `api/config/` – Logging, paths, parsers, and general configuration
- `api/utils/` – General utilities (e.g., URL helpers, logging system)
- `api/test/` – Backend tests and Jest setup

## 2. Application Bootstrap and Server

### 2.1 `api/app/`

- **`api/app/index.js`**
  - Entry-point–oriented module (app-level) which likely:
    - Initializes the Express application instance.
    - Wires in core middlewares (body parsing, CORS, logging).
    - Connects to the database (via `api/db`).
    - Attaches routes from `api/server/routes`.
    - Integrates app-level clients (e.g., external service clients) from `api/app/clients/`.
  - This module is used by the primary server bootstrapping logic (`api/server/index.js`).

- **`api/app/clients/`**
  - Houses client wrappers for external services (AI providers, RAG API, search, etc.).
  - Key idea: abstract away provider-specific details behind internal client modules so controllers/services can work against a consistent internal interface.

### 2.2 `api/server/`

- **`api/server/index.js`**
  - Main server startup:
    - Imports Express app (or builds it).
    - Binds HTTP server to the configured port.
    - Hooks up graceful shutdown and cleanup (`api/server/cleanup.js`).
    - May attach WebSocket / SSE handlers for streaming responses.
  - **`api/server/index.spec.js`** provides tests for the server initialization and basic routes/health checks.

- **`api/server/cleanup.js`**
  - Contains routines to:
    - Close DB connections.
    - Flush or close Redis connections.
    - Stop background workers or timers.
  - Invoked on process termination signals or explicit shutdown.

- **`api/server/experimental.js`**
  - Holds experimental / feature-flagged server logic.
  - Typically used to gate new features under config flags before promotion to stable routes.

- **`api/server/socialLogins.js`**
  - Central configuration/integration of social login auth flows.
  - Likely wires together Passport strategies from `api/strategies/` with route handlers to support OAuth logins.

#### 2.2.1 Controllers, Services, Routes, Middleware, Utils

The `server` directory is further subdivided:

- `api/server/controllers/`
  - Controller modules implementing request handlers.
  - Responsibilities:
    - Validate and parse incoming requests.
    - Call services / models.
    - Shape responses (JSON payloads, status codes).
  - Should contain thin logic—heavy business logic lives in services/models.

- `api/server/services/`
  - Encapsulate business logic and orchestration:
    - Conversation flows
    - Agent and tool orchestration
    - Token counting and billing
    - Integration with external AI providers
  - Services are reusable from multiple controllers.

- `api/server/routes/`
  - Route registration modules, structured by domain:
    - `/auth`, `/user`, `/conversation`, `/message`, `/agents`, `/files`, `/balance`, etc.
  - Each route module:
    - Declares HTTP endpoints and methods.
    - Applies relevant middleware (auth, rate limiting).
    - Binds endpoints to controllers.

- `api/server/middleware/`
  - Cross-cutting middleware functions, such as:
    - Authentication checks (ensure user is logged in, roles, permissions).
    - Rate limiting and abuse protection.
    - Request logging.
    - Request validation & schema checks.
    - Error handling and response normalization.

- `api/server/utils/`
  - Utility helpers scoped to server usage, such as:
    - Response helpers (standardized error/ok responses).
    - Request decorations.
    - Stream and WebSocket helpers for streaming AI responses.

## 3. Database Layer

### 3.1 Connection & Initialization

- **`api/db/connect.js`**
  - Establishes connection to the database (likely MongoDB, but check implementation to confirm).
  - Uses environment variables (from root `.env`, `api/test/.env.test.example`) for host, port, credentials, and DB name.
  - Handles connection retries and connection error logging.

- **`api/db/index.js`**
  - Exposes a unified entry point for DB modules.
  - Commonly re-exports:
    - `connect()`
    - `models`
  - Used by app bootstrap to ensure DB is ready.

- **`api/db/indexSync.js`**
  - Synchronous/alternative initialization for scripts or special startup flows (e.g., migrations, CLI tools).
  - May be used by `config/` scripts for maintenance tasks.

- **`api/db/models.js`**
  - Aggregates all model definitions into a single object.
  - Ensures models are registered with the underlying ORM/ODM.

### 3.2 Models (`api/models/`)

Models represent persistent entities and key workflows. Each model usually:

- Defines a schema (fields, types, indexes).
- Adds instance and static methods implementing domain-specific logic.
- Encapsulates validation rules and relationships.
- Often has associated tests (`*.spec.js`) verifying core behavior.

Key models:

- **`Action.js`**
  - Represents an action performed by users or agents.
  - Likely ties to auditing or specialized flows (e.g., tool invocations).

- **`Agent.js` + `Agent.spec.js`**
  - Model for LibreChat Agents (no-code assistants).
  - Stores:
    - Name, description, system instructions.
    - Associated tools, endpoints, and capabilities.
    - Sharing configuration (visibility to users/groups).
  - Tests assert correct creation, serialization, and permission logic.

- **`Assistant.js`**
  - Representation of assistant-level settings or meta configuration.
  - May capture assistant-specific defaults for prompts or tools.

- **`Banner.js`**
  - Represents UI banners (e.g., marketing messages, maintenance notices).
  - Connects with CLI scripts to create/update/delete banners.

- **`Categories.js`**
  - Stores category definitions (e.g., for prompts, agents, presets).

- **`Conversation.js` + `Conversation.spec.js`**
  - Core conversation entity:
    - Conversation tree / thread structure.
    - Relationships to users, messages, agents, presets.
    - Branching support (forked conversations).
  - Tests cover:
    - Tree structure invariants.
    - Branching/merging behaviors.

- **`ConversationTag.js`**
  - Tags for conversations (e.g., favorites, categories, status).
  - Supports search & filtering in the UI.

- **`File.js` + `File.spec.js`**
  - Represents files uploaded by users or generated by the code interpreter.
  - Contains metadata:
    - Filename, MIME type, size, owner, conversation/message links.
    - Storage location (path or object storage key).
  - Tests verify:
    - Metadata integrity.
    - Linkage to conversations and messages.

- **`Message.js` + `Message.spec.js`**
  - Individual chat messages:
    - Role (user, assistant, system, tool).
    - Text content, attachments, tool calls.
    - References to conversation and parent message (for branches).
  - Tests ensure:
    - Tree structure & ordering.
    - Editing and resubmission semantics.

- **`Preset.js`**
  - Stores reusable chat presets:
    - Default system prompt.
    - Default model, temperature, and other params.
  - Integrated with sharing and UI selection.

- **`Prompt.js` + `Prompt.spec.js` + `PromptGroupMigration.spec.js`**
  - Prompt templates and groups.
  - Migration tests ensure updates of prompt group schema don’t lose or corrupt data.

- **`Project.js`**
  - Higher-level project concept (e.g., grouping of conversations, assets, agents).

- **`Role.js` + `Role.spec.js`**
  - Role and permission model (e.g., admin, user, group-level roles).
  - Used in authorization checks and sharing.

- **`ToolCall.js`**
  - Representation of tool calls from agents/assistant responses (e.g., MCP tools, code interpreter calls).
  - Captures parameters, results, and metadata.

- **`Transaction.js` + `Transaction.spec.js` + `tx.js` + `tx.spec.js`**
  - Accounting for token usage and billing.
  - `Transaction` describes higher-level spending events.
  - `tx` may encapsulate transactional logic, e.g., bundling multiple operations or adjusting user balances.

- **`spendTokens.js` + `spendTokens.spec.js`**
  - Core token accounting logic to decrement user or project balances.
  - Tied into conversation and agent flows.
  - Tests verify:
    - Correct charging of tokens.
    - Edge cases (insufficient balance, free tiers).

- **`balanceMethods.js`**
  - Helper methods for managing balances:
    - Increase/decrease balance.
    - Query balances and limits.
  - Used by CLI scripts (`config/add-balance.js`, `config/set-balance.js`, etc.).

- **`inviteUser.js`**
  - Model or helper for user invitation flows:
    - Pending invites.
    - Invitation tokens and expiration.

- **`userMethods.js`**
  - Additional methods on the User model (likely defined elsewhere and extended here).
  - Contains logic for verifying permissions, preferences, and derived properties.

- **`interface.js`**
  - Common interface/type definitions or helper functions to unify model usage.

### 3.3 Data Access Patterns

- Most backend business logic uses model methods rather than raw queries.
- Services orchestrate:
  - Complex reads/writes across multiple models.
  - Transactions that involve token updates, conversation/message creation, and file associations.

## 4. Caching, Rate Limiting, and Abuse Detection

### 4.1 Cache Modules (`api/cache/`)

- **`api/cache/index.js`**
  - Entry point that:
    - Initializes Redis clients.
    - Exposes high-level cache operations.
  - Typically provides:
    - Get/Set/Del wrappers.
    - Namespaced keys for specific purposes.

- **`api/cache/getLogStores.js`**
  - Helper to get or construct Redis stores/logs used for:
    - Rate limiting.
    - Violation tracking.
  - Centralizes naming and structure of log stores.

- **`api/cache/banViolation.js` + `banViolation.spec.js`**
  - Functionality to **ban** users or IPs based on violation logs.
  - Works with:
    - Rate limiters.
    - Moderation modules.
  - Tests assert:
    - Correct detection of threshold violations.
    - Correct ban creation and expiration behavior.

- **`api/cache/logViolation.js`**
  - Logs violation events into Redis.
  - Supports:
    - Counting violations per user/IP/unit of time.
    - Providing insights for moderation.

- **`api/cache/clearPendingReq.js`**
  - Clears pending requests for a user or key (e.g., in case of rate limit resets or cancellations).

### 4.2 Integration Points

- Middleware and services call these cache functions to:
  - Apply rate limits on API routes.
  - Throttle abusive behaviors.
  - Keep track of suspicious patterns for moderation.

## 5. Authentication & Authorization

### 5.1 Strategies (`api/strategies/`)

Auth is structured around multiple authentication strategies, likely leveraging Passport or a similar framework.

Key strategy files:

- **`appleStrategy.js` + `appleStrategy.test.js`**
- **`discordStrategy.js`**
- **`facebookStrategy.js`**
- **`githubStrategy.js`**
- **`googleStrategy.js`**
- **`ldapStrategy.js` + `ldapStrategy.spec.js`**
- **`samlStrategy.js` + `samlStrategy.spec.js`**
- **`jwtStrategy.js`**
- **`localStrategy.js`**
- **`openIdJwtStrategy.js`**
- **`openidStrategy.js` + `openidStrategy.spec.js`**

Shared infrastructure:

- **`api/strategies/index.js`**
  - Registers and exports configured strategies.
  - Provides a single import point for the rest of the app.

- **`api/strategies/process.js` + `process.test.js`**
  - Common logic to handle the outcome of authentication flows:
    - User lookup / creation.
    - Linking external identities to internal users.
    - Session/token issuance.
  - Tests validate correct behavior for various auth flows.

- **`api/strategies/socialLogin.js` + `socialLogin.test.js`**
  - Wrapper logic for social logins (GitHub, Google, Discord, etc.).
  - Standardizes callback behavior and error handling across providers.

- **`api/strategies/validators.js` + `validators.spec.js`**
  - Validation helpers for auth:
    - Input validation for login/registration.
    - Normalization of external profile data.
  - Tests verify robust validation and error messages.

### 5.2 Roles and Permissions

- Based on **`Role`** and related models in `api/models/`.
- Authorization enforced via:
  - Route-level middleware.
  - Service-layer checks using `userMethods` and `Role` relationships.

## 6. Configuration & Logging

### 6.1 Configuration (`api/config/`)

- **`api/config/index.js`**
  - Main config aggregator:
    - Reads environment variables.
    - Exposes strongly-typed configuration structure for:
      - Database
      - Redis
      - Logging
      - External services (AI providers, RAG, search, etc.)
      - Feature flags and experimental features.

- **`api/config/paths.js`**
  - Centralizes filesystem paths (e.g., data directories, log directories).
  - Avoids hard-coded paths scattered through the codebase.

- **`api/config/parsers.js`**
  - Utilities to parse config values:
    - JSON-based config strings.
    - Comma-separated lists.
    - Numbers and booleans with defaults.

- **`api/config/winston.js`**
  - Winston logger configuration:
    - Log levels, formats (JSON/pretty).
    - Transports (console, file).
    - Environment-specific behavior (dev vs prod).

- **`api/config/meiliLogger.js`**
  - Specialized logging for Meilisearch or related indexing operations.
  - Used when search indexing or RAG integration uses Meilisearch.

### 6.2 Utilities (`api/utils/`)

- **`deriveBaseURL.js` + `deriveBaseURL.spec.js`**
  - Logic for deriving the base URL of the API:
    - Considers proxy headers (e.g., `X-Forwarded-Host`, `X-Forwarded-Proto`).
    - Supports use cases behind reverse proxies and load balancers.
  - Tests verify correct base URL computation under different header combinations.

- **`extractBaseURL.js` + `extractBaseURL.spec.js`**
  - Utility to extract base URL from incoming requests or configuration.
  - Useful for constructing absolute URLs (e.g., links in emails, redirects).

- **`LoggingSystem.js`**
  - High-level logging abstraction over Winston (and possibly other sinks).
  - May define:
    - Namespaced loggers.
    - Structured log formats.
    - Integration with external logging and monitoring.

## 7. Testing (`api/test/`)

- **`api/test/jestSetup.js`**
  - Global Jest setup:
    - Polyfills and global mocks.
    - DB and Redis test environment initialization.
    - Environment variable defaults for tests.

- **`api/test/.env.test.example`**
  - Example environment file for running API tests.

- **`api/test/__mocks__/`**
  - Manual mocks for external services (e.g., providers, email, RAG).
  - Helps isolate unit tests from network dependencies.

- **`api/test/app/`**
  - Tests related to `api/app/` initialization and high-level app behavior.

- **`api/test/server/`**
  - Tests focusing on Express routes, middleware, and controllers.

- **`api/test/services/`**
  - Tests for service modules:
    - Conversation flows.
    - Agent orchestration.
    - Token accounting and billing.

- Many models have adjacent `*.spec.js` files in `api/models/` validating:
  - Schema behavior.
  - Methods and hooks.
  - Edge cases and error paths.

## 8. Typical Request Flow

1. **Client Request:**
   - A request arrives (e.g., POST `/api/conversation`) at the Express server.

2. **Middleware:**
   - Global middleware applies:
     - Logging.
     - CORS.
     - Body parsing.
   - Route-specific middleware adds:
     - Authentication (JWT, session, etc.).
     - Rate limiting (via `api/cache/`).
     - Validation.

3. **Routing & Controller:**
   - The route module maps the path to a controller.
   - The controller:
     - Validates input further if needed.
     - Calls appropriate service methods.
     - Handles errors and shapes the response.

4. **Service Layer:**
   - Services orchestrate:
     - DB operations using models (conversations, messages, agents, users).
     - Token accounting via `spendTokens` and transaction models.
     - Calls to external AI providers (through `app/clients`).
     - Caching via `api/cache/`.

5. **Database & Cache:**
   - Models perform CRUD operations.
   - Redis caches or rate limit counters are updated as needed.

6. **Response:**
   - Controller sends JSON or streaming responses back to the frontend.
   - Logging captures relevant metadata for observability.

## 9. Extensibility Guidelines

When adding new backend features:

1. **Model Changes:**
   - Define/extend models in `api/models/`.
   - Add indexes where needed (performance and correctness).
   - Add tests (`*.spec.js`) covering key invariants.

2. **Services:**
   - Implement business logic in a service module under `api/server/services/`.
   - Keep controllers thin by delegating to services.

3. **Routes and Controllers:**
   - Create/update route modules under `api/server/routes/`.
   - Add controller functions under `api/server/controllers/`.
   - Apply appropriate middleware (auth, validation, rate limiting).

4. **Auth & Permissions:**
   - If new capabilities require different access:
     - Update roles/permissions in `Role`/`userMethods`.
     - Wire in middleware checks.

5. **Caching / Rate Limits:**
   - Use `api/cache` helpers to:
     - Implement rate limits for new routes.
     - Log violations if necessary.

6. **Configuration:**
   - Add new config parameters to `api/config/index.js` and `.env.example`.
   - Use parsers where appropriate to normalize environment variable values.

7. **Testing:**
   - Update or add tests in `api/test/` and model-level `*.spec.js`.
   - Ensure CI passes all Jest suites.

This document should be updated whenever significant architectural or behavior changes are made to the backend.
