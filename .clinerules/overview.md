# LibreChat – Project Overview

This document captures the high-level architecture and main concepts of the LibreChat project as a base for future development.

## 1. Project Identity

- **Name:** LibreChat  
- **Type:** Full-stack web application (multi-user AI chat platform)  
- **Primary Goal:** Provide a ChatGPT-like interface with:
  - Multi-model support (OpenAI, Azure OpenAI, Anthropic, Google, Vertex, AWS Bedrock, local models, OpenAI-compatible endpoints, etc.)
  - Advanced features such as Agents, Web Search, RAG, Code Interpreter, image generation, and multi-user management.
- **Monorepo:** Backend API, web client, shared packages, infra/deployment assets, and utilities are all in a single repository.

## 2. High-Level Architecture

### 2.1 Top-Level Structure (selected)

- `api/` – Node.js/Express backend API
- `client/` – Vite + React TypeScript frontend
- `packages/` – Shared libraries used by API and/or client
  - `packages/api/`
  - `packages/client/`
  - `packages/data-provider/`
  - `packages/data-schemas/`
- `config/` – Node-based CLI utilities for admin and maintenance tasks
- `e2e/` – Playwright/Jest-based end-to-end tests
- `helm/` – Helm charts for Kubernetes deployment
- `redis-config/` – Redis cluster and TLS configuration
- `utils/` – Misc utilities (e.g., env management, Docker helpers)
- `deploy-compose.yml`, `docker-compose*.yml`, `Dockerfile*` – Docker/docker-compose deployment
- `librechat.example.yaml` – Main LibreChat configuration example (endpoints, features, etc.)
- Root `package.json` – Overall dev tooling and scripts
- `rag.yml` – Configuration for external RAG API integration

### 2.2 Runtime Components

At runtime, a typical LibreChat deployment consists of:

1. **LibreChat API (Backend)**
   - Runs inside `api/` project
   - Responsible for authentication, user & conversation management, tools/agents orchestration, chat routing to model providers, file handling, and business logic.

2. **LibreChat Client (Frontend)**
   - Runs inside `client/` project
   - Single-page React app built with Vite.
   - Communicates with API over HTTP/WebSocket.

3. **Database Layer**
   - Configured via `api/db` and environment variables.
   - Stores users, conversations, messages, presets, prompts, agents, transactions, etc.
   - Implementation details captured in `.clinerules/backend.md`.

4. **Caching & Queues**
   - Redis (configured via `redis-config/` and Helm/docker-compose) used for:
     - Rate limiting, violation logging, and other cache-related flows (`api/cache/`).
     - Possibly session/caching for features like web search or RAG.

5. **External Services**
   - AI providers (OpenAI, Azure OpenAI, Anthropic, Google, Vertex AI, custom endpoints, etc.).
   - Optional:
     - RAG API (external service, see `rag.yml`).
     - Web search providers + rerankers (e.g., via Jina).
     - MCP Servers for agents/tools.
     - Social login providers (Google, GitHub, Discord, etc.).

6. **Infrastructure**
   - Docker images defined by `Dockerfile`, `Dockerfile.multi` and docker-compose files.
   - Kubernetes deployments via `helm/librechat` and `helm/librechat-rag-api`.

### 2.3 Key Architectural Themes

- **Modular Backend**
  - Clear separation between:
    - Models (`api/models/`)
    - Controllers/services (`api/server/controllers`, `api/server/services`)
    - Routes (`api/server/routes`)
    - Strategies (auth integration in `api/strategies/`)
    - Caching (`api/cache/`)
    - Utility functions (`api/utils/`)

- **Typed/Shared Schema Layer**
  - `packages/data-schemas/` likely defines shared validation or TypeScript types/interfaces for both client and server.
  - `packages/data-provider/` encapsulates data access patterns for client components.

- **Client-Server Contract**
  - API types and client-specific utilities shipped in `packages/api` and `packages/client`.
  - This enables shared typing and DTO definitions across front and back.

- **Feature Flags & Config**
  - `librechat.example.yaml` defines endpoints, tools, and feature configuration.
  - Environment variables from `.env.*` files and root `config/` scripts help tune runtime behavior and environment setup.

## 3. Major Feature Areas (Functional Overview)

This section synthesizes major features described in `README.md` and implied by directory structure. Each feature set is documented in more detail in backend/frontend docs.

### 3.1 Multi-Model AI Support

- Supports multiple AI providers:
  - OpenAI, Azure OpenAI, Anthropic, AWS Bedrock, Google, Vertex AI, etc.
  - Custom endpoints: any OpenAI-compatible REST API.
  - Local or proxy-based models (Ollama, koboldcpp, etc.) and aggregator providers (OpenRouter, together.ai, etc.).
- Configured primarily via:
  - `librechat.yaml` (example: `librechat.example.yaml`).
  - Environment variables.
- The backend abstracts provider implementations, mapping a unified request shape to provider-specific APIs.

### 3.2 Agents & Tools

- “LibreChat Agents” provide:
  - No-code assistant definition (system prompt, tools, endpoints).
  - Sharing and permission controls (users/groups).
  - Integration with:
    - Code interpreter
    - Web search
    - File search / external RAG
    - MCP servers (tool providers)
- The backend orchestrates agent definitions, tool invocations, and stateful interactions.

### 3.3 Code Interpreter

- Isolated, sandboxed execution of code:
  - Languages: Python, Node.js/TS, Go, C/C++, Java, PHP, Rust, Fortran (via containerized environment).
- Integrated with file upload/download:
  - Users can send a file, have the interpreter process it, and receive resulting files.
- Execution is designed to be secure and not leak host system state.

### 3.4 Web Search & RAG

- Web search:
  - Combines external search engines, scrapers, and rerankers.
  - Configurable reranking with services like Jina.
- RAG:
  - Optional external RAG API (configured via `rag.yml` and Helm chart `librechat-rag-api`).
  - Backend components manage retrieval orchestration and integration with agent/model calls.

### 3.5 Image Generation & Editing

- Support for:
  - GPT-Image-1, DALL-E 2/3, Stable Diffusion, Flux, MCP servers for images.
- Users interact through the chat UI to generate or transform images.

### 3.6 Conversations & Context Management

- Key concepts:
  - Conversations, Messages, Presets, Prompts, Agent definitions.
  - Branching / forking:
    - Fork message
    - Fork conversation
  - Editing and resubmitting messages with modified context.
- Backend persists conversation tree; frontend visualizes branches and manages UI flows.

### 3.7 Multimodal & File Chat

- Support for:
  - Image uploads (vision models: Claude 3, GPT-4.5, GPT-4o, o1, Llama-Vision, Gemini, etc.).
  - File chat (PDF, text, etc.) through AI providers or RAG.
- File metadata and storage handled by backend file model and storage abstraction.

### 3.8 Multi-User, Auth, & Security

- Authentication:
  - Implements:
    - Local email/password
    - OAuth2 social logins (Google, GitHub, Discord, etc.)
    - LDAP, SAML, and JWT strategies
  - See `api/strategies/`.
- Authorization:
  - Roles, permissions, and group-based sharing (prompts, presets, agents, etc.).
- Moderation:
  - Built-in moderation pipelines and token-based accounting (`spendTokens`, transaction models).
- Caching and abuse detection:
  - `api/cache/banViolation`, `logViolation` and related utilities.

### 3.9 Configuration & Deployment

- Deployment options:
  - Docker + docker-compose: `Dockerfile`, `Dockerfile.multi`, `docker-compose.yml`, `deploy-compose.yml`
  - Kubernetes via Helm: `helm/librechat`, `helm/librechat-rag-api`
  - Configurable reverse proxy and SSL: nginx templates in `client/nginx.conf`, `redis-config/redis-tls.conf`
- Root `.env.example` and `api/test/.env.test.example` as templates.

### 3.10 UI Features

- ChatGPT-inspired UI with:
  - Sidebar for conversations/presets/agents.
  - Reasoning UI for chain-of-thought models.
  - Multi-language UI (translation with Locize).
  - Speech-to-text & text-to-speech integration.
  - Import/export of conversations.
  - Search across messages and conversations.
- The `client/` app uses TailwindCSS, React, and Vite.

## 4. Development Model & Tooling

### 4.1 Languages & Frameworks

- Backend:
  - Node.js (JavaScript), Express.
  - Testing via Jest.
- Frontend:
  - TypeScript, React, Vite.
  - Testing via Jest and possibly Testing Library.
- Shared:
  - TypeScript-based schemas and data providers in `packages/`.
- E2E:
  - Playwright (configs under `e2e/`).

### 4.2 Code Quality and Linting

- ESLint configured via `eslint.config.mjs`.
- Prettier config via `.prettierrc`.
- Jest configs:
  - `api/jest.config.js`
  - `client/jest.config.cjs`
  - E2E config files in `e2e/`.

### 4.3 Monorepo Tooling

- Root `package.json` orchestrates:
  - Installation and build of `api/`, `client/`, and `packages/`.
  - Likely uses npm workspace-like structure or custom scripts (see `.clinerules/cli.md` for specifics).

## 5. Environments

Typical environments:

- **Local Development:**
  - Back-end: `api/` dev server
  - Front-end: `client/` Vite dev server
  - Local DB and Redis (via docker-compose)
  - Local configuration: `.env` + `librechat.yaml`

- **Staging / Production:**
  - Docker or Kubernetes
  - External managed database and Redis
  - `librechat.yaml` tuned for production endpoints and features
  - Optional external RAG API deployment (`librechat-rag-api` Helm chart)

## 6. Testing Strategy (High-Level)

- **Unit & Integration Tests:**
  - `api/test/` – API-level Jest tests (server, services, strategies, etc.)
  - `client/test/` – Frontend unit/integration tests.
- **Model / Business Logic Tests:**
  - Many models have `.spec.js` tests in `api/models/`.
- **E2E Tests:**
  - `e2e/` – Playwright-based tests verifying major user flows.
- Detailed breakdown is in `.clinerules/testing.md`.

## 7. Future Documentation Map

Additional detailed documentation in `.clinerules/`:

- `.clinerules/backend.md` – API architecture, models, services, routes, auth, and data flows.
- `.clinerules/frontend.md` – React app structure, routing, state management, and feature views.
- `.clinerules/deployment.md` – Docker, Kubernetes/Helm, external services, and environment configuration.
- `.clinerules/testing.md` – Testing taxonomy and practices.
- `.clinerules/cli.md` – Admin and maintenance CLI commands under `config/` and other utilities.
- `.clinerules/README.md` – Index for this rules directory and how to maintain it.

This overview should serve as a conceptual map; implementation details are elaborated in the related `.clinerules` documents.
