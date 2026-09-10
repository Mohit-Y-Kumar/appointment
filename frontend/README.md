# DocNest Frontend

This app is the patient-facing interface for DocNest. It allows users to browse doctors, book appointments, pay for services, chat with doctors, and view their profile history.

## Features

- doctor search and filtering
- doctor profile pages
- appointment booking and tracking
- payment flow using Razorpay
- live chat UI and message history
- profile update and photo upload
- AI symptom checker suggestions
- responsive design for desktop and mobile

## Local setup

1. Install dependencies

```bash
cd frontend
npm install
```

2. Create the environment file

```bash
cp .env.example .env
```

Example:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=your_public_razorpay_key
```

3. Start the app

```bash
npm run dev
```

The app runs at http://localhost:5173 by default.

## Production build

```bash
npm run build
```

The build output is served by nginx in the Docker setup.

## Important notes

- The backend URL must match the backend service URL used in deployment.
- Every frontend origin must be allowed in the backend ALLOWED_ORIGINS environment variable.
- In production, do not hardcode secrets in the frontend. Only public keys such as Razorpay public keys should be exposed.

## App structure

```text
frontend/
├── src/
├── public/
├── index.html
├── package.json
├── vite.config.js
├── Dockerfile
└── README.md
```

