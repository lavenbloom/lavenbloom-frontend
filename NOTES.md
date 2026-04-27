# frontend — Study Notes

---

## Table of Contents

1. [How the Frontend Works](#1-how-the-frontend-works)
2. [Runtime Environment Variable Injection](#2-runtime-environment-variable-injection)
3. [Docker Basics — Multi-Stage Builds](#3-docker-basics--multi-stage-builds)
4. [Dockerfile — Line by Line](#4-dockerfile--line-by-line)
5. [env.sh — Runtime Config Injection Explained](#5-envsh--runtime-config-injection-explained)
6. [Q&A](#6-qa)

---

## 1. How the Frontend Works

### What it is

A **React + TypeScript** single-page application (SPA). React renders the entire UI in the browser — the server only delivers a single `index.html` + JavaScript bundle. All page navigation, data fetching, and rendering happens client-side.

### Pages and routing

| Route | Component | Who can access |
|---|---|---|
| `/login` | Login page | Public |
| `/register` | Register page | Public |
| `/dashboard` | Dashboard | Authenticated only |
| `/journal` | Journal entries | Authenticated only |
| `*` (default) | Redirect to `/dashboard` | — |

**Private routes** check for a JWT token in `localStorage`. If no token exists, the user is redirected to `/login`. This check happens in the browser — it's a UX guard, not a security boundary. The real security boundary is the backend services verifying the JWT on every API call.

### How it talks to backend services

The React app makes HTTP requests to the gateway. All backend APIs go through one URL: the gateway's NodePort (`<node-ip>:30080`). Routes are:
- `POST /auth/register` — registration
- `POST /auth/login` — login
- `GET /habits`, `POST /habits` — habit management
- `GET /journal`, `POST /journal` — journal entries

The base URL (`REACT_APP_API_URL`) is an environment variable injected at runtime.

### Technology choices

| Technology | Role | Why |
|---|---|---|
| React | UI framework | Industry standard SPA framework |
| TypeScript | Language | Type safety catches errors at build time |
| Vite | Build tool | Faster than Create React App, modern bundler |
| React Router | Client-side routing | De facto standard for React SPAs |
| Nginx | HTTP server in container | Lightweight, high-performance static file serving |

---

## 2. Runtime Environment Variable Injection

### The problem with React environment variables

React apps are built into static JavaScript files. At build time, `import.meta.env.REACT_APP_API_URL` (or `process.env.REACT_APP_API_URL`) is **baked into the JavaScript bundle as a string**. This means: if you build the image with `API_URL=https://dev-api.com`, that URL is hardcoded in the bundle — you cannot change it without rebuilding the image.

For a 12-factor application with separate dev and prod environments, you need the **same image** to work in both. You cannot have different images per environment (you would lose confidence that the tested image is what's running in prod).

### The solution: `env.sh`

Instead of reading environment variables at build time, the frontend reads them from a JavaScript file (`/env-config.js`) that is generated at **container startup** by `env.sh`.

```bash
#!/bin/sh
# env.sh — runs when the container starts, before nginx serves traffic
echo "window.__env__ = {" > /usr/share/nginx/html/env-config.js
for var in $(env | grep "^REACT_APP_" | cut -d= -f1); do
  echo "  $var: \"$(eval echo \$$var)\"," >> /usr/share/nginx/html/env-config.js
done
echo "};" >> /usr/share/nginx/html/env-config.js
```

This script:
1. Finds all environment variables starting with `REACT_APP_`
2. Writes them into `/usr/share/nginx/html/env-config.js` as a JavaScript object on `window.__env__`

The `index.html` includes this script tag before the React bundle:
```html
<script src="/env-config.js"></script>
```

The React app reads:
```typescript
const API_URL = window.__env__?.REACT_APP_API_URL ?? 'http://localhost:8000';
```

This way, the same Docker image works in dev, staging, and prod — only the environment variables change at container startup.

---

## 3. Docker Basics — Multi-Stage Builds

The frontend uses a **multi-stage build** — the most important Docker pattern to understand for frontend applications.

### Why multi-stage builds?

Node.js + npm produces an enormous `node_modules` folder (~200MB for a typical React app). This is needed to **build** the app but not to **serve** it. The final built output is just HTML, CSS, and JavaScript files (a few MB total).

Without multi-stage: your final image would contain Node.js, npm, all of `node_modules`, and the source code — a ~500MB image.

With multi-stage: the final image contains only nginx + the built static files — ~30MB.

### Multi-stage pattern

```dockerfile
# Stage 1: Builder (large, temporary)
FROM node:18-alpine AS builder
# ... install dependencies and build the React app
# Final output: /app/dist/ folder with HTML + JS + CSS

# Stage 2: Runner (small, final)
FROM nginx:alpine
# Copy ONLY the built files from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html
# Stage 1 is discarded — node_modules, source code, npm — all gone
```

The key instruction: `COPY --from=builder /app/dist /usr/share/nginx/html`
- `--from=builder` — copy from the named stage `builder` instead of the build context (your local filesystem)
- `/app/dist` — the output of `npm run build` in the builder stage
- `/usr/share/nginx/html` — nginx's default static file serving directory

### Why `node:18-alpine` and `nginx:alpine`?

`alpine` variants are based on Alpine Linux (~5MB OS). They produce significantly smaller images than Debian-based variants. Alpine is appropriate here because:
- The builder stage is temporary and discarded
- nginx on Alpine has no compilation requirements — it's a pre-compiled binary
- The React build tool (Vite) has no C extension requirements

---

## 4. Dockerfile — Line by Line

```dockerfile
FROM node:18-alpine AS builder
```
**Stage 1.** Named `builder` so stage 2 can reference it. `node:18-alpine` provides Node.js 18 on Alpine Linux. Node 18 is the LTS (Long Term Support) version — stable, security-patched.

---

```dockerfile
WORKDIR /app
```
All subsequent build stage instructions use `/app` as working directory.

---

```dockerfile
COPY package*.json ./
```
Copies `package.json` AND `package-lock.json` (the `*` wildcard matches both). Copied before source code for the same layer caching reason as other services: if dependencies haven't changed, the next `RUN npm ci` step is skipped.

---

```dockerfile
RUN npm ci
```
**`npm ci`** (clean install) — stricter than `npm install`:
- Reads `package-lock.json` exactly — installs the **exact same versions** every time (reproducible builds)
- Fails if `package-lock.json` is out of sync with `package.json` (catches accidental version drift)
- Never modifies `package-lock.json` — safe in CI/CD and Docker builds
- Faster in Docker because it skips the dependency resolution step

---

```dockerfile
COPY . .
```
Copies all remaining source files (`src/`, `public/`, `vite.config.ts`, `tsconfig.json`, etc.) into the builder stage. This layer is invalidated on any source file change.

---

```dockerfile
RUN npm run build
```
Runs the build script from `package.json` — typically `vite build`. This:
1. Compiles TypeScript to JavaScript
2. Bundles all modules into optimised chunks
3. Minifies HTML, CSS, JavaScript
4. Outputs to `dist/` (Vite default) or `build/` (Create React App default)

The output is pure static files — no Node.js needed to serve them.

---

```dockerfile
FROM nginx:alpine
```
**Stage 2 begins.** A fresh, clean Alpine + nginx image. Nothing from stage 1 carries over except what is explicitly `COPY --from=builder`'d. The entire `node_modules` directory, source files, npm, Node.js — all discarded.

---

```dockerfile
COPY --from=builder /app/dist /usr/share/nginx/html
```
Copies only the built static files from stage 1 into nginx's serving directory. Everything else in stage 1 is gone.

`/usr/share/nginx/html` is where nginx serves files from by default. Nginx's default config maps `GET /` → `index.html`, `GET /static/main.js` → `main.js`, etc.

---

```dockerfile
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh
```
Places `env.sh` in `/docker-entrypoint.d/`. This is nginx's entrypoint directory — nginx's official image runs all `.sh` scripts in this directory **before starting nginx**. This is the hook used to generate `env-config.js` from container environment variables at startup time.

`chmod +x` makes the script executable.

---

```dockerfile
EXPOSE 80
```
nginx listens on port 80 by default. Documents this in the image metadata. The Kubernetes Service maps `port: 80 → targetPort: 80`.

---

*(No `CMD` is defined.)* nginx:alpine has its own built-in `CMD ["nginx", "-g", "daemon off;"]` inherited from the base image. `daemon off;` keeps nginx in the foreground — necessary for containers (a container exits when its main process exits; a daemonised nginx would immediately hand off to the background and the container would exit).

---

## 5. env.sh — Runtime Config Injection Explained

```bash
#!/bin/sh
echo "window.__env__ = {" > /usr/share/nginx/html/env-config.js
for var in $(env | grep "^REACT_APP_" | cut -d= -f1); do
  echo "  $var: \"$(eval echo \$$var)\"," >> /usr/share/nginx/html/env-config.js
done
echo "};" >> /usr/share/nginx/html/env-config.js
```

**`#!/bin/sh`** — Uses `/bin/sh` (POSIX shell), not bash. Alpine doesn't include bash by default — `sh` is BusyBox's ash shell, which is always available.

**`echo "window.__env__ = {" > ...`** — Creates/overwrites `env-config.js` with the first line. The `>` redirect creates the file fresh on every container start.

**`env | grep "^REACT_APP_"`** — Lists all environment variables starting with `REACT_APP_`. The `|` pipes output to the next command.

**`cut -d= -f1`** — Splits each `KEY=VALUE` line on `=` (`-d=`) and takes field 1 (`-f1`) — the variable name only.

**`for var in ...`** — Iterates over the list of variable names.

**`$(eval echo \$$var)`** — For a variable named `REACT_APP_API_URL`, this expands to the value of that variable. The `eval` is needed because `var` contains the variable *name*, not its value. `\$$var` becomes `$REACT_APP_API_URL` after the first `$` expansion, and `eval` then expands that to the actual value.

**Output (example):**
```javascript
window.__env__ = {
  REACT_APP_API_URL: "http://192.168.1.10:30080",
};
```

**`>>` vs `>`:** The first echo uses `>` (overwrite). All loop echoes use `>>` (append). This builds the file incrementally.

### How Kubernetes provides these env vars

In the frontend Kubernetes Deployment, environment variables are set:
```yaml
env:
  - name: REACT_APP_API_URL
    value: "http://192.168.1.10:30080"
```
Or from a ConfigMap/Secret. When the container starts, nginx's entrypoint runs `env.sh`, which writes these into `env-config.js`. Nginx then starts and serves this file along with the React app.

---

## 6. Q&A

**Q: What is the difference between `npm install` and `npm ci`?**
A: `npm install` resolves dependency versions (may produce slightly different installs), modifies `package-lock.json` if needed, and updates the cache. `npm ci` reads `package-lock.json` exactly, fails if it's inconsistent with `package.json`, never modifies it, and deletes `node_modules` first for a truly clean install. In CI/CD and Docker, `npm ci` is always preferred — it guarantees reproducible builds.

**Q: Why does the frontend image not run as a non-root user?**
A: nginx binds to port 80, which is a privileged port on Linux (requires root or `CAP_NET_BIND_SERVICE`). The official `nginx:alpine` image starts as root to bind to port 80, then drops to the `nginx` user for worker processes. To fully run as non-root, you'd change nginx to listen on port 8080 (unprivileged) and adjust the Kubernetes Service accordingly.

**Q: How does nginx know to serve `index.html` for all routes (React SPA routing)?**
A: It doesn't by default — nginx would return a 404 for `/dashboard` because there's no `dashboard` file in the serving directory. For SPA routing to work, nginx needs a config like:
```nginx
try_files $uri $uri/ /index.html;
```
This tells nginx: try the exact URI, then URI as directory, then fall back to `index.html`. React Router then handles the route client-side. The current nginx config should include this — otherwise direct navigation to `/dashboard` would fail.

**Q: Why use Vite instead of Create React App (CRA)?**
A: Vite is significantly faster: it uses native ES modules during development (no bundling on save — instant HMR), and esbuild for production builds (10-100x faster than webpack). CRA uses webpack, which is slower but more mature. For new projects, Vite is the industry standard choice.

**Q: The `COPY . .` instruction copies everything — does this include `.env` files with secrets?**
A: It would, unless `.env` is listed in `.dockerignore`. The frontend repo should have a `.dockerignore` that excludes `.env`, `node_modules/`, `.git/`, and other non-essential files. The `.gitignore` file excludes `.env` from git, but docker build uses `.dockerignore` separately. Always verify that secrets are not baked into the image with `docker history <image>`.

**Q: What does `daemon off;` do in the nginx CMD?**
A: By default, nginx forks a daemon process and exits the parent. In a container, the container's life is tied to PID 1 (the main process). If nginx daemonises, the main process exits immediately after starting the daemon — the container thinks the process finished and exits. `daemon off;` keeps nginx running in the foreground as PID 1, keeping the container alive for as long as nginx runs.
