# lavenbloom-frontend

> **Runbook & Developer Walkthrough** — React/TypeScript single-page application for the Lavenbloom platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pages and Components](#pages-and-components)
4. [Environment Configuration](#environment-configuration)
5. [Local Development Walkthrough](#local-development-walkthrough)
6. [Docker Walkthrough](#docker-walkthrough)
7. [Runtime Config Injection](#runtime-config-injection)
8. [CI/CD Pipeline Walkthrough](#cicd-pipeline-walkthrough)
9. [Kubernetes Deployment](#kubernetes-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Overview

`lavenbloom-frontend` is the **React + TypeScript + Vite** single-page application that provides the user interface for the Lavenbloom habit-tracking and journaling platform.

It is served by **Nginx** inside a multi-stage Docker image and communicates with backend microservices through the **Kubernetes Gateway API (kgateway/Envoy)** in production or the local Nginx gateway in Docker Compose development.

| Property | Value |
|---|---|
| **Framework** | React 18 + TypeScript |
| **Build tool** | Vite |
| **Runtime server** | Nginx (Alpine) |
| **Port** | `80` (container) / `3000` (local dev) |
| **Docker image** | `lavenbloom/lavenbloom-frontend` |
| **Build** | Multi-stage: `node:18-alpine` builder → `nginx:alpine` runtime |

---

## Architecture

```
Browser
   │  HTTP
   ▼
┌─────────────────────────┐
│  Envoy Gateway          │  (Kubernetes, path-based routing)
│  (or nginx-gateway)     │
└──────┬──────────────────┘
       │
       │ path: /        → frontend:80
       │ path: /auth    → auth-service:8000
       │ path: /habits  → habit-service:8000
       │ path: /journal → journal-service:8000
       │ path: /notif.  → notification-service:8000
       ▼
┌──────────────────────────────┐
│  lavenbloom-frontend         │
│  nginx:alpine serving        │
│  /usr/share/nginx/html       │
│  (React SPA build output)    │
└──────────────────────────────┘
```

### Dockerfile — Multi-stage build

```
Stage 1: node:18-alpine (builder)
  ├── npm install
  ├── npm run build
  └── Output: /app/dist

Stage 2: nginx:alpine (runtime)
  ├── COPY dist/ → /usr/share/nginx/html/
  ├── COPY nginx.conf → /etc/nginx/conf.d/default.conf
  ├── COPY env.sh → /docker-entrypoint.d/env.sh  ← runtime config injection
  └── USER nginx (non-root)
```

### Source Layout

```
frontend/
├── src/
│   ├── App.tsx              # Router — defines all page routes
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles
│   ├── pages/
│   │   ├── Login.tsx        # Login form → POST /auth/login
│   │   ├── Register.tsx     # Registration form → POST /auth/register
│   │   ├── Dashboard.tsx    # Habit grid + metrics chart
│   │   └── Journal.tsx      # Journal entry list + create form
│   ├── components/          # Shared UI components
│   └── utils/               # API helpers, token management
├── env.sh                   # Runtime env-var injection script
├── nginx.conf               # Nginx SPA config (try_files for client-side routing)
├── Dockerfile
├── package.json
└── vite.config.ts
```

---

## Pages and Components

### `/login` — Login page

- Form: `username` + `password`
- On submit: `POST /auth/login` (form-encoded)
- On success: stores JWT in `localStorage` as `token`, redirects to `/dashboard`
- Public route — accessible without authentication

### `/register` — Registration page

- Form: `username` + `email` + `password`
- On submit: `POST /auth/register` (JSON body)
- On success: redirects to `/login`
- Public route

### `/dashboard` — Main dashboard (protected)

- Requires JWT in `localStorage`. Redirects to `/login` if absent.
- Displays:
  - **Habit grid** (`HabitGrid` component) — shows all habits, allows logging daily completion
  - **Metrics chart** (`MetricsChart` component) — visualizes health metrics over time
- API calls: `GET /habits`, `POST /habits`, `POST /habits/{id}/logs/{date}`, `GET /metrics`

### `/journal` — Journal page (protected)

- Requires JWT. Redirects to `/login` if absent.
- Lists all journal entries (newest first)
- Form to create a new entry
- API calls: `GET /journals`, `POST /journals`

### Route guard — `PrivateRoute`

```tsx
function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/login" />;
}
```

Any unknown path (`/*`) redirects to `/dashboard`, which redirects to `/login` if unauthenticated.

---

## Environment Configuration

The frontend reads its API base URL from `window.__env__` at runtime (injected by `env.sh`). This means **the same Docker image can be used for dev and prod** by passing different environment variables — no rebuild required.

| Variable | Description |
|---|---|
| `REACT_APP_API_URL` | Base URL for all API calls (e.g., `http://gateway:8080` or `https://api.lavenbloom.com`) |

At runtime, `env.sh` generates `/usr/share/nginx/html/env-config.js`:

```js
window.__env__ = {
  REACT_APP_API_URL: "http://localhost:8080",
};
```

The app reads this as:
```ts
const apiUrl = window.__env__?.REACT_APP_API_URL ?? '';
```

---

## Local Development Walkthrough

### Prerequisites

- Node.js 18+ and npm
- Backend services running (use Docker Compose for the full stack)

### Step 1 — Clone and install

```bash
git clone https://github.com/lavenbloom/lavenbloom-frontend.git
cd lavenbloom-frontend
npm install
```

### Step 2 — Configure API URL

Create a `.env.local` file:

```env
VITE_API_URL=http://localhost:8080
```

Or set the environment variable directly:

```bash
export REACT_APP_API_URL=http://localhost:8080
```

### Step 3 — Start the dev server

```bash
npm run dev
```

App is available at `http://localhost:5173` (Vite default port).  
Hot module replacement is enabled — edits appear instantly in the browser.

### Step 4 — Run with the full backend

From the project root, start all services:

```bash
docker compose up
```

Then open `http://localhost:3000` (frontend via Docker Compose) or `http://localhost:8080` (via nginx gateway).

### Step 5 — End-to-end walkthrough

1. Navigate to `http://localhost:3000/register`
2. Create an account (username, email, password)
3. You are redirected to `/login` — log in with your credentials
4. On the **Dashboard**, create a habit and log it for today
5. Navigate to **Journal** and write your first entry
6. Return to Dashboard and update a health metric

---

## Docker Walkthrough

### Build the image

```bash
docker build -t lavenbloom-frontend:local .
```

The build process:
1. `node:18-alpine` stage installs dependencies (`npm install`) and builds the React app (`npm run build`)
2. Vite outputs to `/app/dist`
3. `nginx:alpine` stage copies `dist/` to `/usr/share/nginx/html/`
4. `env.sh` is placed in `/docker-entrypoint.d/` — Nginx runs it on container start

### Run the container

```bash
docker run -d \
  -e REACT_APP_API_URL="http://localhost:8080" \
  -p 3000:80 \
  lavenbloom-frontend:local
```

Open `http://localhost:3000`.

### Full stack via Docker Compose

```bash
# From project root
docker compose up
```

Frontend is at `http://localhost:3000`, gateway at `http://localhost:8080`.

---

## Runtime Config Injection

`env.sh` is the mechanism that enables the **same Docker image** to work in both dev and prod environments without a rebuild.

### How it works

1. When the Nginx container starts, Docker runs all scripts in `/docker-entrypoint.d/` (alphabetically) before `nginx` itself starts
2. `env.sh` scans environment variables prefixed with `REACT_APP_` and writes them to `env-config.js`:

```sh
#!/bin/sh
echo "window.__env__ = {" > /usr/share/nginx/html/env-config.js
env | grep REACT_APP_ | while read line; do
  key=$(echo "$line" | cut -d '=' -f1)
  value=$(echo "$line" | cut -d '=' -f2-)
  echo "  $key: \"$value\"," >> /usr/share/nginx/html/env-config.js
done
echo "};" >> /usr/share/nginx/html/env-config.js
```

3. `index.html` includes `<script src="/env-config.js"></script>` so `window.__env__` is available before the React bundle executes

### In Kubernetes

Pass `REACT_APP_API_URL` as an environment variable on the Deployment (or via a Kubernetes Secret):

```yaml
env:
  - name: REACT_APP_API_URL
    value: "https://gateway.lavenbloom.example.com"
```

---

## CI/CD Pipeline Walkthrough

Pipeline file: `.github/workflows/ci-frontend.yml`

| Event | Jobs triggered |
|---|---|
| Pull Request → `develop` / `main` | `sast` → `sca` → `trivy` → `pr-check` |
| Push → `develop` | `dev-publish` → `dev-cd` |
| GitHub Release created | `publish` → `cd` |

### Job breakdown

| Job | Shared workflow | What it does |
|---|---|---|
| `sast` | `ci-sast.yml` | SonarQube static analysis on TypeScript source |
| `sca` | `ci-sca.yml` | Snyk dependency scan (`runtime: node`, runs `npm ci`) |
| `trivy` | `ci-docker-build.yml` | Full Docker build + Trivy scan. Image is **not** pushed — scan only. |
| `pr-check` | — | Aggregated pass/fail status for branch protection |
| `dev-publish` | `ci-docker-publish.yml` | Build multi-stage image, push tagged `dev-{SHA}` to Docker Hub |
| `dev-cd` | `cd-template.yml` | Update `values-dev.yaml` with new tag, ArgoCD syncs dev cluster |
| `publish` | `ci-docker-publish.yml` | Build and push semver-tagged image on GitHub Release |
| `cd` | `cd-template.yml` | Update `values-prod.yaml`, ArgoCD syncs prod cluster |

### Docker image tagging

| Environment | Tag format | Example |
|---|---|---|
| Dev | `dev-{7-char SHA}` | `dev-a3f9c12` |
| Prod | Semver from GitHub Release | `v1.2.0` |

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `SONAR_TOKEN` | SonarQube authentication token |
| `SONAR_URL` | SonarQube server URL |
| `SNYK_TOKEN` | Snyk API token |
| `DOCKER_USERNAME` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub password or access token |
| `HELM_REPO_PAT` | GitHub PAT for `lavenbloom-charts` push access |

---

## Kubernetes Deployment

The frontend runs in the `frontend` namespace as a standard Deployment behind the Envoy Gateway.

### Helm install (dev)

```bash
helm install frontend ./microservices/frontend -f values-dev.yaml
```

### Verify the deployment

```bash
# Check pod status
kubectl get pods -n frontend -l app=frontend

# Stream logs (Nginx access log)
kubectl logs -n frontend deployment/frontend -f

# Port-forward for local testing (bypasses gateway)
kubectl port-forward -n frontend deployment/frontend 3000:80
```

Open `http://localhost:3000`.

### Check env-config.js is generated correctly

```bash
kubectl exec -n frontend deployment/frontend -- cat /usr/share/nginx/html/env-config.js
# Expected output:
# window.__env__ = {
#   REACT_APP_API_URL: "https://gateway.lavenbloom.example.com",
# };
```

### Gateway route

The Envoy Gateway routes `/` → `frontend:80` (the Nginx service in the `frontend` namespace).  
All other paths (`/auth`, `/habits`, `/journal`, `/notifications`) route to their respective backend services.

---

## Troubleshooting

### Blank page / JavaScript errors in browser console

- Open browser DevTools → Console
- Look for `Cannot read properties of undefined (reading 'REACT_APP_API_URL')`
  - This means `env-config.js` was not generated. Check that `env.sh` executed at container startup
  - Verify the script has execute permission: `chmod +x /docker-entrypoint.d/env.sh`

### Nginx returns `404` for direct page navigation (e.g., `/dashboard`)

The `nginx.conf` must include `try_files $uri $uri/ /index.html;` to support client-side routing.  
If you see 404 on deep links, check that the Nginx configuration was copied correctly during the Docker build:

```bash
docker exec <container_id> cat /etc/nginx/conf.d/default.conf
```

### API calls return `net::ERR_CONNECTION_REFUSED`

- In Docker Compose: verify the gateway container is running and the `REACT_APP_API_URL` points to the correct gateway port (`http://localhost:8080`)
- In Kubernetes: verify `REACT_APP_API_URL` environment variable is set on the frontend Deployment and matches the Gateway's external IP or hostname

### Login succeeds but dashboard shows no data

The JWT stored in `localStorage` may be from a different `JWT_SECRET`. Clear `localStorage` in the browser and log in again:

```js
// In browser console:
localStorage.clear();
location.reload();
```

### SCA (Snyk) fails on `npm ci`

The pipeline runs `npm ci` which requires `package-lock.json` to be committed.  
Ensure `package-lock.json` is **not** in `.gitignore`.