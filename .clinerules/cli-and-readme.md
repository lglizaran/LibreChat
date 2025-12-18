# CLI & Admin Scripts – `config/`

This document describes the Node-based CLI utilities located under the `config/` directory. These scripts are intended for administrative and maintenance tasks and usually run against an existing LibreChat deployment (local or remote).

> Always ensure you target the correct environment (DB/Redis/API) before running these scripts. Many of them mutate production data and should be used carefully.

## 1. Common Behavior

- All scripts are standard Node.js programs, invoked with `node` from the repo root or via npm scripts.
- Most scripts:
  - Read environment from the root `.env`.
  - Use shared helpers from `config/helpers.js`.
  - Connect to the same database and Redis as the backend (`api/`).
- Before running any script:
  - Confirm `.env` is present and correctly configured.
  - Ensure the targeted DB and Redis instances are reachable.

### 1.1 Helpers (`config/helpers.js`)

- Provides common utilities for CLI scripts, such as:
  - Bootstrapping database and configuration.
  - Parsing CLI arguments/flags.
  - Standardized logging / error handling patterns.

All scripts should use these helpers to keep behavior consistent.

### 1.2 Connection Script (`config/connect.js`)

- Central connection utility for CLI tools.
- Responsibilities:
  - Load environment configuration (DB, Redis, other services).
  - Establish database connections (same as `api/db`).
  - Optionally connect/disconnect Redis.
- Used by other scripts to avoid duplicating connection logic.

---

## 2. User & Auth Management Scripts

These scripts operate on user records, credentials, and access control.

### 2.1 `config/create-user.js`

- Creates a new user in the database.
- Typical behavior:
  - Prompts for or accepts via flags: email, password, role, and possibly name.
  - Hashes the password and saves a new user document.
- Use cases:
  - Bootstrapping the first admin user.
  - Adding users in environments where self-registration is disabled.

### 2.2 `config/delete-user.js`

- Deletes a user account by identifier (email, ID, or username depending on implementation).
- May cascade or validate:
  - Reassignment or cleanup of associated data (conversations, agents, etc.).
- Use with caution in production; consider disabling instead of deleting if supported.

### 2.3 `config/list-users.js`

- Lists users in the system.
- Typical outputs:
  - ID, email, roles, creation date, and maybe status (active/banned).
- Useful for audits and verifying other user scripts.

### 2.4 `config/reset-password.js`

- Resets a user’s password.
- Behaviors:
  - Identify user by email or ID.
  - Set a new password (prompt or argument).
- Ensure new credentials are communicated securely to the user.

### 2.5 `config/ban-user.js`

- Bans or disables a user account.
- Likely interacts with:
  - User flags/fields in the DB.
  - Possibly cache/ban lists (coordinate with `api/cache/banViolation.js`).
- Use to handle abuse without deleting data.

### 2.6 `config/invite-user.js`

- Manages invitation-based user onboarding.
- Typical flow:
  - Creates an invite token linked to an email and optional role.
  - Sends or logs an invite link.
- Tightly integrated with `api/models/inviteUser.js`.

### 2.7 `config/user-stats.js`

- Provides statistics about users.
- Examples:
  - Total users, active vs inactive.
  - Creation trends.
- Useful for monitoring platform growth and usage.

---

## 3. Token Balance & Billing Scripts

These scripts manage per-user or per-project token balances and spending.

### 3.1 `config/add-balance.js`

- Increments balance for a user or project.
- Works with `api/models/balanceMethods.js` and transaction logic.
- Common usage:
  - Top up trial accounts.
  - Grant additional tokens for testing or promotions.

### 3.2 `config/set-balance.js`

- Sets (overwrites) balance for a user or project.
- Typically used when:
  - Correcting balances.
  - Migrating to a new billing schema.
- Use carefully in production; can override existing value.

### 3.3 `config/list-balances.js`

- Lists balances across users/projects.
- Useful for:
  - Auditing and debugging token usage.
  - Verifying the effects of `add-balance`/`set-balance`.

### 3.4 `config/user-stats.js` (also in section 2)

- May also expose token/billing related stats (depending on implementation).

---

## 4. Banners & Announcements

Scripts for managing UI banners (e.g., announcements, maintenance notices).

### 4.1 `config/update-banner.js`

- Creates or updates a banner record in the DB.
- Leveraging `api/models/Banner.js`.
- Fields may include:
  - Message text, type (info/warning), active flags, start/end dates.

### 4.2 `config/delete-banner.js`

- Deletes a banner by ID or key.
- Used when a banner is no longer needed.

### 4.3 `config/deployed-update.js`

- Likely coordinates banner or state updates after deployments.
- Possible responsibilities:
  - Set “what’s new” banners.
  - Toggle maintenance flags.
- Consult implementation for exact semantics, but treat as a post-deploy helper.

---

## 5. Permissions & Migration Scripts

Scripts that update permissions or migrate data schemas.

### 5.1 `config/migrate-agent-permissions.js`

- Migrates or normalizes permissions for agents (see `api/models/Agent.js`).
- Use cases:
  - After schema changes to agent sharing.
  - When introducing new roles/ownership semantics.

### 5.2 `config/migrate-prompt-permissions.js`

- Equivalent for prompts (see `api/models/Prompt.js`).
- Tasks:
  - Migrate old prompt sharing fields to new format.
  - Ensure prompt groups/permissions remain consistent.

### 5.3 `config/reset-terms.js`

- Resets or updates a terms-of-service/acceptance flag.
- Likely:
  - Forces users to re-accept updated terms.
  - Clears or adjusts terms-related fields on user documents.

---

## 6. Cache, Search & Meili Integration

### 6.1 `config/flush-cache.js`

- Flushes caches used by LibreChat.
- Behavior may include:
  - Clearing Redis keys used for rate limiting or caching.
- Coordinate with `api/cache/index.js` and related modules.

### 6.2 `config/reset-meili-sync.js`

- Resets or restarts search index synchronization with Meilisearch.
- Typical tasks:
  - Clear sync state tables.
  - Trigger full re-indexing or re-sync of entities (conversations, agents, etc.).
- Works with `api/config/meiliLogger.js` and associated sync logic.

---

## 7. Update & Maintenance Scripts

### 7.1 `config/update.js`

- General update/maintenance script.
- Often used to:
  - Run versioned migrations.
  - Adjust config values or run multi-step upgrade logic.
- Should typically be run after upgrading the LibreChat version (if documented in release notes).

### 7.2 `config/deployed-update.js` (see section 4)

- Post-deployment update tasks: banners, flags, or environment-specific adjustments.

### 7.3 `config/prepare.js`

- Prepares the environment for running the app or tests.
- Possible responsibilities:
  - Validate configuration files.
  - Perform one-time setup tasks.
  - Generate derived configs or assets.

### 7.4 `config/stop-backend.js`

- Utility to stop a locally running backend.
- Implementation dependent, but might:
  - Interact with PM2, nodemon, or custom process markers.
- Use for local dev convenience.

---

## 8. Translations & Content

### 8.1 `config/translations/`

- Directory for translation-related scripts and assets.
- Potential uses:
  - Sync with Locize or other translation services.
  - Generate/update translation bundles.
- Consult individual files for specifics; integrate with frontend i18n.

---

## 9. Packages & Workspace Management

### 9.1 `config/packages.js`

- Helper script for monorepo package commands.
- Responsibilities may include:
  - Running commands across `packages/`, `api/`, and `client/`.
  - Updating dependencies or validating package manifests.

---

## 10. Usage Guidelines

1. **Environment Awareness**
   - Confirm you are targeting the correct environment:
     - Local dev, staging, or production.
   - Double-check DB connection strings and Redis pointers in `.env`.

2. **Dry-Run Where Possible**
   - If a script supports a `--dry-run` or equivalent flag, use it first.
   - For destructive actions (delete-user, delete-banner, reset-*), consider backing up or testing in a staging environment.

3. **Logging**
   - Most scripts log progress and results to stdout.
   - For complex operations (migrations, mass updates), redirect logs to a file for auditing.

4. **Idempotency**
   - Prefer scripts that can safely be re-run (idempotent).
   - For migration scripts, ensure checks are in place to avoid double-application.

5. **Document Changes**
   - When introducing a new CLI script:
     - Add its description and usage here.
     - Note any required environment variables or preconditions.

---

# `.clinerules` Directory Index

This section serves as an overview of the documentation stored under `.clinerules/` and how it should be maintained.

## 1. Files

- `overview.md`
  - High-level project overview and architecture map.
- `backend.md`
  - Backend (`api/`) architecture, models, services, routes, auth and caching.
- `frontend.md`
  - Frontend (`client/`) architecture, build tooling, and UI feature structure.
- `deployment.md`
  - Configuration, Docker, docker-compose, Helm/Kubernetes, Redis, and environments.
- `testing.md`
  - Testing strategy and layout for backend, frontend, and e2e.
- `token-credits-pricing.md`
  - Explanation of token usage, credit costs, and USD pricing logic.
- `cli-and-readme.md` (this file)
  - CLI/admin scripts documentation and `.clinerules` index.

You can treat `cli-and-readme.md` as the entry point for `.clinerules` if no separate `README.md` exists.

## 2. When to Update `.clinerules`

Update these docs when:

- **Significant Codebase Changes**
  - Major refactoring of backend or frontend.
  - New modules (e.g., new feature areas like additional tools, providers, or agents).
- **New Features or CLI Tools**
  - New CLI scripts in `config/`.
  - New deployment flows or infra components.
- **Behavior Changes**
  - Changes to auth flows, token accounting, cache behavior, or test strategy.
- **Deployment Changes**
  - New environment variables, Docker/Helm options, or additional services (DBs, queues, caches).

Avoid updating for trivial changes:

- Typos in comments.
- Small cosmetic refactors that don’t affect public behavior.
- Minor variable renames.

## 3. Update Process

1. **Identify Impact**
   - Determine which document(s) are affected:
     - Backend vs frontend vs deployment vs testing vs CLI.
2. **Edit in Markdown**
   - Keep structure:
     - Clear headings.
     - Bullet lists for responsibilities and file mappings.
   - Prefer descriptive but concise sections.
3. **Cross-Reference**
   - When adding a new module:
     - Mention it in all relevant docs (e.g., backend+deployment+testing if appropriate).
4. **Verify Consistency**
   - Ensure the description matches actual code and configuration.
   - Update any examples or commands that changed.

This documentation set is intended to be the single source of truth for new contributors and for planning new developments. Treat it as part of the codebase and keep it current when behaviors or architectures evolve.
