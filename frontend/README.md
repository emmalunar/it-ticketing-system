# Frontend

Next.js 16 App Router client for the IT ticketing system. It is a single-page client-side app: login, requester, officer, and admin views are rendered in the browser from one page, and all data comes from the Django REST API. API calls are proxied through Next.js rewrites to the local backend at `http://127.0.0.1:8000` (see `next.config.ts`), so the Django dev server must be running for the app to work.

## Commands

```bash
npm run dev     # development server on http://localhost:3000
npm run build   # production build
npm run lint    # ESLint over the project (eslint .)
```

Dependencies are managed with npm (`npm ci` for a clean install). For backend setup and overall project documentation, see the repository root `README.md` and the `docs/` directory.
