# DocNest Admin

This app provides the admin and doctor management dashboard for DocNest. It is used for doctor onboarding, scheduling, appointment actions, revenue visibility, reviews, and platform analytics.

## Features

- admin login and JWT-based session handling
- doctor management and profile creation
- appointment dashboard and cancellation tools
- doctor analytics for revenue, appointment count, and trends
- doctor profile and availability controls
- live chat support with patients
- admin refund workflow
- production-ready deployment via nginx + Docker

## Local setup

1. Install dependencies

```bash
cd admin
npm install
```

2. Create the environment file

```bash
cp .env.example .env
```

Example:

```env
VITE_BACKEND_URL=http://localhost:4000
```

3. Start the dashboard

```bash
npm run dev
```

The app runs at http://localhost:5174 by default.

## Production build

```bash
npm run build
```

This build is served by nginx in the Docker image.

## Security and configuration notes

- keep the backend URL aligned with the deployed API host
- restrict backend origins to trusted frontends and admin domains
- do not expose secret tokens in the frontend bundle
- in production, the admin UI should be served behind HTTPS and a trusted ingress

## Project layout

```text
admin/
├── src/
├── public/
├── index.html
├── package.json
├── vite.config.js
├── Dockerfile
├── nginx.conf
└── README.md
```

