# Frontend Architecture – `client/`

This document describes the frontend (web client) architecture of LibreChat, implemented in the `client/` directory. It is a reference for building new UI features and maintaining existing ones.

## 1. Overview

- **Runtime:** Browser (SPA)
- **Language:** TypeScript
- **Framework:** React
- **Bundler/Dev Server:** Vite
- **Styling:** TailwindCSS + custom CSS
- **Testing:** Jest (+ Testing Library style tests in `client/test/`)

Primary responsibilities:

- ChatGPT-style UI for conversations, agents, and tools
- Multi-model selection and configuration
- Presets, prompts, agents, and file interactions
- Web search, RAG, image generation, and code artifacts UI
- Authentication flows and multi-user management UX
- Settings, profile, and admin-related UIs

High-level layout:

- `client/index.html` – Root HTML shell for the SPA
- `client/src/` – React app source
- `client/public/` – Static assets (logos, icons, etc.)
- `client/test/` – Frontend unit/integration tests
- `client/nginx.conf` – Nginx config for production deployments
- `client/vite.config.ts` – Vite configuration
- `client/tailwind.config.cjs` – Tailwind config
- `client/tsconfig.json` – TypeScript config

> The exact component structure lives under `client/src/` (pages, components, hooks, context, etc.). This document focuses on how the frontend fits into the overall system and the expectations for new code.

## 2. Build & Tooling

### 2.1 Vite (`client/vite.config.ts`)

- Configures the Vite dev server and bundling:
  - Entry is typically `client/src/main.tsx` (or similar).
  - Uses React plugin and TypeScript support.
  - Provides dev server with HMR for rapid iteration.
- Environment variables are exposed via `import.meta.env.*`, often mapped from `.env` and/or the LibreChat YAML configuration and backend responses.

When adding new build-time behavior:

- Prefer Vite plugins over custom scripts when possible.
- Keep environment-specific behavior (e.g., API base URLs) driven by env variables and/or the backend’s derived base URL utilities.

### 2.2 TypeScript (`client/tsconfig.json`)

- Defines TypeScript compilation, path aliases, and strictness:
  - Use existing path aliases for shared modules (e.g., `@/components/...`).
  - Keep types in sync with shared packages in `packages/` (e.g., `packages/api`, `packages/client`, `packages/data-schemas`).

Guidelines:

- Use TypeScript types/interfaces from shared packages where available instead of redefining shapes in the client.
- Ensure new modules compile cleanly under the configured TS rules.

### 2.3 TailwindCSS & PostCSS

- `client/tailwind.config.cjs`:
  - Tailwind configuration, including:
    - Content paths to scan (React files).
    - Theme extensions (colors, fonts, spacing).
    - Plugins used by LibreChat UI.
- `client/postcss.config.cjs`:
  - Configures PostCSS pipeline (Tailwind + autoprefixer, etc.).

Guidelines:

- Prefer Tailwind utility classes over ad-hoc CSS, unless a component needs very specific styling.
- Maintain consistency with existing design tokens in Tailwind theme.

### 2.4 Jest Tests (`client/jest.config.cjs`)

- Frontend test configuration using Jest:
  - Sets up environment as `jsdom`.
  - Includes transforms for TS/JSX via Babel.
  - Points to a setup file if needed (e.g., for testing-library extensions, mocks).

When adding tests:

- Place component/page tests under `client/test/`.
- Use React Testing Library patterns (render, screen, user-event) where appropriate.
- Mirror the module hierarchy of `client/src/` in `client/test/` for discoverability.

## 3. Application Structure (`client/src/`)

> The exact folder names may vary (e.g., `components`, `features`, `hooks`, `context`, `routes`), but the following conceptual structure applies.

Typical structure:

- **Entry & Bootstrap**
  - `client/src/main.tsx` or `index.tsx`:
    - Mounts `<App />` into `#root` from `index.html`.
    - Wraps app with providers:
      - Router (e.g., React Router).
      - Global state (e.g., Redux/Zustand/Context).
      - Theme and localization providers.
      - Query clients (e.g., React Query) if used.

- **App Shell**
  - `client/src/App.tsx`:
    - Global layout including:
      - Sidebar with conversations, presets, agents.
      - Top bar / header actions.
      - Main chat viewport.
    - Configures global routes (if using `react-router`):
      - `/` for main chat.
      - `/agents`, `/presets`, `/settings`, etc.
    - Handles global modals and toasts.

- **Feature Modules (Conceptual)**
  - **Chat / Conversations**
    - Conversation list and search.
    - Chat thread view and message list.
    - Composer with:
      - Model selection.
      - Tools (web search, code interpreter, RAG, image generation).
      - Attachments (file upload).
    - Message actions:
      - Edit & resubmit.
      - Fork message / fork conversation.
      - Copy, delete, export.

  - **Agents**
    - Agent gallery (marketplace-like UI).
    - Agent creation/edit forms:
      - Name, description.
      - System prompt.
      - Tools and endpoints configuration.
      - Sharing options (users/groups).
    - Agent details view (metadata, usage).

  - **Presets & Prompts**
    - Manage reusable presets:
      - Default model/params.
      - Default system instructions.
    - Manage prompts and prompt groups:
      - Naming, grouping, and sharing.
    - Integration into composer dropdowns.

  - **Web Search & RAG**
    - Toggle web search for a conversation.
    - UI that displays search result snippets and citations.
    - RAG UI:
      - File search results and document snippets.
      - Metadata and links to underlying documents.

  - **Code Interpreter**
    - Chat UI for code execution responses.
    - Display of generated files and artifacts.
    - UI for code artifacts:
      - Render React/HTML/Mermaid results generated by the model.
    - Controls to download or open generated artifacts.

  - **Image Generation & Editing**
    - Inputs for prompts and optional source image.
    - Display of generated images and edit history.
    - Endpoint selection (GPT-Image-1, DALL-E, SD, Flux, MCP).

  - **Auth & User Management**
    - Login/sign-up screens for:
      - Local email/password.
      - OAuth (Google, GitHub, Discord, etc.).
      - Enterprise (LDAP, SAML).
    - Account settings:
      - Profile info.
      - Language and UI preferences.
      - Tokens/usage view (if exposed).
      - Add credits UI with package selection and **Stripe Elements** integration.
    - Logout and session handling.

  - **Settings & Admin UX**
    - Model selection defaults.
    - Feature toggles (web search, code interpreter, agents).
    - Admin-only screens (if surfaced) for user or banner management.

  - **Misc**
    - Localization (i18n) component integration with Locize.
    - Speech-to-text and text-to-speech controls.
    - Import/export conversation modals.

- **Shared UI Components**
  - Reusable primitives (buttons, inputs, dropdowns, modal, tooltip).
  - Layout components (panels, resizable split panes, drawers).
  - Data display components (lists, tables, pills, chips).
  - Message rendering components for:
    - Markdown (with code blocks, syntax highlighting).
    - Inline images.
    - Code artifacts and diagrams.

- **Hooks & Context**
  - Hooks to interact with:
    - Conversation state (current conversation, selected message).
    - User and auth state.
    - Settings and feature flags.
  - Context providers for:
    - Global app configuration.
    - Theme (light/dark).
    - Localization.

- **API Clients**
  - Specialized hooks or services that call the backend API:
    - Conversations: fetch, create, update, delete.
    - Messages: send, edit, delete, fork.
    - Agents, presets, prompts.
    - File operations (upload/download).
  - Where possible, types and request/response shapes are imported from `packages/api` and `packages/data-schemas`.

## 4. Static Assets (`client/public/`)

- Contains assets referenced by `index.html` and the SPA:
  - Logos (`client/public/assets/logo.svg`, etc.).
  - Icons, favicon, manifest.
- Assets are served as static files from the frontend container/web server.

Guidelines:

- Store brand and general-purpose assets here.
- Component-specific images can also be imported from `src` for tree-shaking and better bundling if appropriate.

## 5. Integration with Backend & Shared Packages

### 5.1 API Communication

- The frontend interacts with the backend (`api/`) over HTTP and WebSockets/SSE:
  - Uses a base API URL that may be:
    - Derived from config/env during build.
    - Provided dynamically via backend endpoints (using base URL helpers).
- Common patterns:
  - `fetch`/Axios wrappers with error handling and auth token injection.
  - Streaming endpoints for chat responses (SSE or WebSocket).
  - Typed request/response using shared types from `packages/api` / `packages/data-schemas`.

When implementing new features:

- Reuse existing HTTP client abstraction and patterns (e.g., interceptors).
- Keep all API endpoint URLs and payload shapes centralized where possible.

### 5.2 Shared Packages

- **`packages/client/`**:
  - Contains React- or frontend-specific utilities/components shared across apps (if multiple).
  - May provide:
    - Shared hooks.
    - Shared UI components.
    - Typed client API methods.

- **`packages/data-schemas/`**:
  - Contains TypeScript types and schemas for:
    - Conversations, messages, presets, prompts, agents, roles, transactions, etc.
  - Used in both frontend and backend to ensure contract consistency.

- **`packages/api/`**:
  - May provide typed API client utilities for:
    - Standard API operations.
    - Error handling and pagination.

Guidelines:

- Always prefer these packages for types and common logic instead of redefining shapes in the client.
- If a new domain model is introduced in the backend, add types/schemas in `packages/data-schemas` and consume them in the client.

## 6. Localization & Accessibility

### 6.1 Localization

- LibreChat supports many languages, coordinated via Locize and `librechat.example.yaml` / docs.
- The frontend:
  - Uses an i18n library (e.g., `react-i18next`) configured to use Locize data.
  - Wraps UI with translation provider.
  - Uses `t('key')` style lookups in components.

When adding UI text:

- Never hard-code user-facing strings.
- Add translation keys and use them via the translation system.
- Avoid concatenating strings with dynamic values; prefer interpolation provided by i18n library.

### 6.2 Accessibility

- Aim for accessible components:
  - Proper ARIA attributes on interactive elements.
  - Keyboard navigability and focus management.
  - Semantic HTML where possible.
- E2E tests and external audits (e.g., Lighthouse/axe) may be used to validate accessibility.

## 7. Testing (`client/test/`)

- Contains Jest-based tests for frontend logic and components.
- Tests should:
  - Focus on important flows: conversation rendering, composer behavior, model selection, etc.
  - Use realistic mock data (aligned with `packages/data-schemas` types).
  - Stub API calls via mocks rather than hitting live servers.

Patterns:

- Unit tests for small components and hooks.
- Integration-style tests for pages/routes (rendering full UIs with mocked API).

## 8. Deployment & Static Serving

- In production, the built frontend is typically:
  - Served by Nginx using `client/nginx.conf`.
  - Exposed on a specific port and reverse-proxied behind the main ingress.
- `npm run build` (from `client/`) produces static assets in `client/dist` which are then used in Docker and Helm charts.

Key points:

- The frontend should not assume a hard-coded API URL; use environment variables or a backend-provided base URL.
- Ensure routing works both in dev and production (configure history fallback where necessary).

## 9. Extensibility Guidelines

When adding or modifying frontend features:

1. **Use Existing Patterns**
   - Reuse existing layout components, UI primitives, and hooks.
   - Follow established patterns for API access and state management.

2. **Keep Components Focused**
   - Split large views into smaller components.
   - Keep side-effect-heavy logic in hooks or controller-like modules rather than in JSX.

3. **Type Safety**
   - Use TypeScript strictly with types from shared packages.
   - Avoid `any`; rely on generics and discriminated unions where appropriate.

4. **Styling**
   - Prefer Tailwind utility classes and existing theme tokens.
   - Keep custom CSS minimal and organized.

5. **Tests**
   - Add/update tests in `client/test/` for new components or flows.
   - Ensure CI passes all frontend test suites.

6. **Docs & `.clinerules`**
   - For substantial UI or UX changes:
     - Update this document with new feature modules or flows.
     - Document any new cross-cutting patterns (e.g., new global providers, new layout system).

This document should be updated alongside significant frontend architecture or feature changes to keep it a reliable reference for contributors.
