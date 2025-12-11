# Deployment, Configuration & Infrastructure

This document describes how LibreChat is configured and deployed across environments, and how key infra pieces fit together.

## 1. Configuration Sources

### 1.1 Environment Variables

- Root `.env.example` documents core environment variables:
  - Database connection (host, port, DB name, credentials)
  - Redis connection and options
  - JWT/auth secrets and session config
  - AI provider API keys and endpoints
  - Feature flags and optional integrations (RAG, web search, etc.)
- For local dev, copy `.env.example` → `.env` (not committed).

Backend tests:

- `api/test/.env.test.example` provides test-specific defaults used by Jest.

### 1.2 LibreChat YAML

- `librechat.example.yaml` is the main application configuration file:
  - Declares AI endpoints (OpenAI, Azure, Anthropic, Bedrock, Google, Vertex, local endpoints, aggregators, etc.).
  - Controls:
    - Enabled features (agents, tools, code interpreter, web search, RAG, image generation).
    - Per-endpoint models, capabilities, and limits.
    - UI defaults and flags that are surfaced to the client.
- For deployments, copy and adapt as `librechat.yaml` (or environment-specific variants).

### 1.3 RAG Configuration

- `rag.yml` defines integration with an external RAG API:
  - Base URL and authentication to the external RAG service.
  - Indexes and collections used for retrieval.
- RAG is optional; the app can run without it.

## 2. Docker & Local Deployment

Top-level Docker artifacts:

- `Dockerfile` – main container image for LibreChat (multi-stage build).
- `Dockerfile.multi` – supporting image for multi-service builds (often used in more complex deployments).
- `.dockerignore` – excludes development artifacts from Docker build context.

### 2.1 docker-compose

- `docker-compose.yml` – primary compose stack, typically includes:
  - LibreChat API and Client
  - Database (e.g., MongoDB)
  - Redis
- `docker-compose.override.yml.example` – example overrides for local dev:
  - Port mappings
  - Extra volumes
  - Debugging settings
- `deploy-compose.yml` – deployment-oriented compose file:
  - Tuned settings for “production-like” single-host deployments.

Typical usage (from repo root):

```bash
# Local development baseline (after preparing .env and librechat.yaml)
docker compose up -d
```

You can layer overrides:

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 2.2 Image Responsibilities

The main LibreChat container image typically includes:

- Backend (`api/`) Node.js server.
- Frontend (`client/`) built assets served by a web server (e.g., Nginx) or via the backend.
- Node runtime for CLI tools (`config/`) and scripts.

Redis and database are provided either via compose or external managed services.

## 3. Kubernetes & Helm

Kubernetes deployment is managed via Helm charts:

- `helm/librechat/` – main LibreChat Helm chart.
- `helm/librechat-rag-api/` – optional RAG API Helm chart.

### 3.1 `helm/librechat/`

The LibreChat chart captures:

- Deployments for:
  - API + Client containers
- Services:
  - Cluster-internal services for HTTP/WebSockets
- Ingress:
  - Public entrypoints (hostnames, TLS, paths)
- ConfigMaps & Secrets:
  - Application config (e.g., `librechat.yaml`)
  - Environment variables
  - Provider secrets
- Volumes:
  - Persistent storage if required (e.g., file uploads, logs)

Typical configuration values control:

- Image registry, tag, and pull policy.
- Replicas and resource limits/requests.
- External DB/Redis connection strings vs. in-cluster dependencies.
- Ingress domain, TLS certificates, and annotations.

### 3.2 `helm/librechat-rag-api/`

Optional chart to deploy an external RAG API service:

- Provides:
  - Deployment and Service for the retrieval API.
  - Config for indexes/collections and backend store.
- LibreChat connects to this RAG API using config from `rag.yml` and environment variables.

## 4. Redis Cluster & TLS

`redis-config/` contains a minimal Redis cluster setup and TLS configuration, intended for dev/testing or as a reference.

Contents:

- `redis-config/redis-7001.conf`
- `redis-config/redis-7002.conf`
- `redis-config/redis-7003.conf`
  - Configures a 3-node Redis cluster.
- `redis-config/redis-tls.conf`
  - Example TLS-enabled Redis configuration.
- `redis-config/certs/`
  - Certificates and keys used by TLS-enabled Redis.
- Utility scripts:
  - `redis-config/start-cluster.sh` – launches the Redis cluster locally.
  - `redis-config/start-redis-tls.sh` – launches a standalone TLS-enabled Redis instance.
  - `redis-config/stop-cluster.sh` – stops running Redis instances.

LibreChat connects to Redis via environment variables provided to API:

- Host + port (or sentinel/cluster setup).
- TLS flags/paths if using TLS (align with `redis-tls.conf` and certs).

## 5. Root Node Tooling & Workspaces

- `package.json` (root):
  - Orchestrates installation/build for:
    - `api/`
    - `client/`
    - `packages/` (shared code)
    - `config/` (CLI utilities)
  - May define scripts like `npm run dev`, `npm run build`, `npm run test`, etc.
- `bun.lock`, `package-lock.json`:
  - Lockfiles for dependency resolution (bun/npm).

Use the root `package.json` scripts where possible so backend, frontend, and packages stay in sync.

## 6. Namespace Layout Summary

Key directories and their deployment relevance:

- `api/`
  - Docker image includes Node API.
  - Reads env vars/config from K8s ConfigMaps/Secrets or docker-compose env.
- `client/`
  - Built into static assets (`npm run build`).
  - Served via Nginx or the backend contained in the same image.
- `config/`
  - Node-based admin & maintenance CLI scripts (see `.clinerules/cli.md`).
  - Often run in the same container image or via `docker compose run`.
- `e2e/`
  - End-to-end tests (Playwright/Jest).
  - Not part of production deployment but can use the deployed stack.
- `redis-config/`
  - Local Redis cluster/TLS config for development.
  - Reference for configuring managed Redis in production.
- `utils/docker/`
  - Helper scripts or templates for Docker/K8s workflows.

## 7. Typical Environments

### 7.1 Local Development

- **Services**:
  - LibreChat backend + frontend (Docker or local Node/Vite).
  - Local DB and Redis (via docker-compose or standalone containers).
- **Configs**:
  - `.env` at repo root.
  - `librechat.yaml` derived from `librechat.example.yaml`.
  - Optional local RAG stack with `rag.yml` and `helm/librechat-rag-api`.

Patterns:

- Use `docker compose up` for a “single command” setup.
- Alternatively, run:
  - `npm install` (root, then `api/` and `client/` as needed)
  - `npm run dev` from `api/`
  - `npm run dev` from `client/`
  - External DB/Redis self-managed.

### 7.2 Staging / Production

- **Kubernetes (recommended)**:
  - Deploy `helm/librechat` into a cluster.
  - Use managed database (e.g., cloud MongoDB) and managed Redis.
  - Ingress with TLS (Let’s Encrypt, cloud provider LB, etc.).
  - Configure environment via Helm values + ConfigMaps/Secrets.
- **Standalone Docker Host**:
  - Use `deploy-compose.yml` or a custom compose file.
  - Reverse proxy (e.g., Traefik, Nginx) in front of LibreChat service.
  - External DB/Redis recommended.

### 7.3 Scaling & Availability

- Horizontal scaling:
  - Scale LibreChat API replicas in K8s or across multiple compose services.
  - Ensure sticky sessions or token-based auth for WebSockets/SSE as required.
- Caching:
  - Redis centralizes rate limiting and some ephemeral state; use resilient Redis deployments.
- External services:
  - AI providers and RAG API must be highly available; misconfigurations or rate limits can cause chat errors.

## 8. Deployment Checklist

When introducing changes that affect deployment:

1. **Configuration**
   - Update `librechat.example.yaml` and `.env.example` with new keys.
   - Update `rag.yml` if RAG flows are modified.
   - Reflect any new environment variables in Helm values and `deploy-compose.yml`.

2. **Docker**
   - Ensure `Dockerfile` / `Dockerfile.multi` builds successfully.
   - Update image build steps if new packages or build tools are required.

3. **Helm**
   - Update `helm/librechat` values and templates where new config is needed.
   - If RAG changes are significant, update `helm/librechat-rag-api`.

4. **Redis / DB**
   - If schema or caching strategies change, validate:
     - Database migrations or compatibility.
     - Redis key/namespace usage and backwards compatibility.

5. **Docs**
   - Update this `.clinerules/deployment.md` when:
     - Adding new services or dependencies.
     - Changing required environment variables.
     - Introducing new deployment paths or significant infra behavior changes.
