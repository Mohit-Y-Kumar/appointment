# DocNest

DocNest is a full-stack healthcare booking platform built for appointment management, doctor access, patient self-service, and secure payments. The project is split into three apps:

- Frontend: a patient-facing React app
- Admin: doctor and admin dashboard
- Backend: Express API with MongoDB, JWT auth, Socket.IO, Razorpay, Cloudinary, and AI-powered chat

## Overview

This project supports:

- patient registration and login
- email verification before first login
- forgot-password and single-use password reset links
- doctor search, filtering, profiles, and availability
- appointment booking and cancellation
- refund requests and refund status tracking for paid appointments
- secure payment verification with Razorpay
- real-time chat and call signaling
- doctor/admin dashboards and analytics
- AI symptom assistant for medical specialty guidance
- production-ready environment validation, health endpoints, and deployment manifests

Email and password recovery links are sent through the configured SMTP provider. Reset tokens are stored hashed, expire after one hour, and invalidate existing user sessions after a successful password change.

## Tech stack

- Frontend: React + Vite
- Admin app: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Auth: JWT + bcrypt + cookie-based sessions
- Real-time: Socket.IO
- Payments: Razorpay
- Media: Cloudinary
- Emails: Nodemailer
- Security: Helmet, CORS, rate limiting, CSRF validation
- Deployment: Docker, Docker Compose, Kubernetes, Jenkins

## High-level architecture

DocNest uses a layered architecture with separate patient and operations clients. In production, Nginx Ingress routes the patient hostname to the frontend and `/api` requests to the backend; the admin hostname routes to the admin portal.

```text
┌──────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                             │
│  Patient web app (React + Vite)   Admin/doctor portal (React + Vite) │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ HTTPS / REST / Socket.IO
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         EDGE AND TRANSPORT                           │
│  Nginx Ingress: TLS, host routing, and /api routing                  │
│  REST API: HTTP-only auth cookies       Socket.IO: chat and calls    │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│  Express routes → security middleware → domain controllers           │
│  CORS · CSRF · rate limits · role auth · uploads · audit logging     │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      DATA AND INTEGRATIONS                            │
│  Mongoose models → MongoDB                                            │
│  Razorpay (payments/refunds) · Cloudinary (media)                    │
│  SMTP (verification/recovery email) · Groq (AI symptom assistant)    │
└──────────────────────────────────────────────────────────────────────┘
```

### Responsibilities by layer

- **Client layer:** The patient app handles discovery, appointments, payments, profiles, chat, and the symptom assistant. The admin portal supports doctor onboarding, appointment operations, analytics, and doctor access.
- **Transport and middleware:** Express serves REST endpoints while Socket.IO handles real-time chat and call signaling. Shared middleware applies origin checks, security headers, CSRF validation, rate limiting, authentication, uploads, and audit logging.
- **Application layer:** Role-specific routes delegate to controllers for user, doctor, admin, appointment, payment, refund, review, chat, and call workflows. Controllers use Mongoose models for transactional state changes and token/session persistence.
- **Integration layer:** MongoDB stores platform data; Razorpay processes payments and refunds; Cloudinary stores media; SMTP sends account emails; and Groq powers AI-assisted symptom guidance.

### Deployment topology

For local development, the frontend, admin portal, and backend run independently on ports `5173`, `5174`, and `4000`. Docker Compose packages the three applications as containers. Kubernetes adds separate services and deployments, TLS through cert-manager, health probes, resource limits, and host-based ingress routing.

## Architecture reference

### Authentication flow

Patient and doctor accounts use role-specific JWT access and refresh cookies. Registration validates the input, hashes the password with bcrypt, and stores the account in MongoDB. Email verification is required before the first login.

```text
Login request
    ↓
Find account and compare bcrypt password
    ↓
Issue a short-lived access JWT and a rotating refresh token
    ↓
Hash the refresh token and store it with its role, subject, family, and expiry
    ↓
Set role-specific HTTP-only cookies
    ↓
Protected middleware verifies the JWT and authorizes the role
```

When an access token expires, the client calls `/refresh`. The backend verifies the hashed refresh token, checks that it is active, unexpired, and associated with the correct role and account, then rotates it and retries the original request. Logout revokes the refresh token family and clears the cookies. Admin login validates `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` before issuing admin-scoped tokens.

### Core data model

| Model | Purpose and important fields |
|---|---|
| `User` | Patient identity, verified email, bcrypt password, contact details, address, and Cloudinary image URL |
| `Doctor` | Professional profile, speciality, fees, availability, appointment slots, ratings, views, and likes |
| `Appointment` | Patient, doctor, date/time slot, booking snapshots, amount, payment state, cancellation, and completion state |
| `Message` | Chat room, sender and role, sanitized text, optional media, timestamps, and read state |
| `Call` | Caller, recipient, appointment, call type, lifecycle status, timestamps, and duration |
| `Review` | Doctor, patient, completed appointment, rating, comment, and timestamps |
| `Payment` | Appointment, user, amount, Razorpay order/payment IDs, signature, and payment status |
| `RefreshToken` | Hashed token, token family, JWT ID, subject, role, revocation state, and expiry |
| `Refund` | Appointment, payment, requested amount, processing state, gateway refund ID, and audit timestamps |
| `AuditLog` | Actor, request metadata, action, resource, and outcome for operational traceability |

Frequently queried fields should be indexed, including account email, refresh-token hash, appointment creation date, message room and time, and token expiry. Appointment, payment, and refund state changes use MongoDB transactions where atomicity is required.

### Security controls

- **Password security:** Passwords are stored as bcrypt hashes; plaintext passwords and secrets are never persisted.
- **Token security:** Access tokens are short-lived. Refresh tokens are hashed in MongoDB, rotated on use, scoped to a role, and revocable.
- **CSRF protection:** State-changing browser requests must provide the CSRF token issued by the backend and stored in the protected cookie.
- **CORS and headers:** `ALLOWED_ORIGINS` controls credentialed origins, while Helmet supplies security headers including HSTS, `nosniff`, frame protection, and referrer policy.
- **Rate limiting:** General API traffic, authentication routes, AI requests, and payment webhooks use separate limits. Webhook processing is also idempotent by provider event ID.
- **Input validation:** Email, password, address, pagination, identifiers, and payment fields are validated before controller logic runs.
- **XSS defense:** Chat messages and review comments are sanitized on input and sanitized again when retrieved.
- **Authorization:** User, doctor, admin, and appointment-participant middleware enforce role and resource ownership boundaries.
- **Operational security:** Metrics require admin authentication, audit logging is non-blocking, and production environment validation fails startup when critical configuration is missing.

### Real-time communication

Socket.IO is attached to the backend HTTP server. Authenticated clients join appointment or conversation rooms, and the server persists relevant events before broadcasting them.

| Event group | Purpose |
|---|---|
| Chat | Send and receive messages, typing indicators, read receipts, and seen state |
| Calls | Start, accept, reject, end, and miss audio/video calls |
| WebRTC signaling | Relay offers, answers, and ICE candidates between participants |
| Presence and rooms | Join or leave scoped rooms and deliver participant notifications |

Socket authentication is revalidated periodically and again for sensitive events such as sending a message or initiating a call. Invalid sessions are disconnected.

### Development conventions

- Keep routes focused on transport and authorization; place business workflows in controllers.
- Reuse validation and sanitization helpers from `backend/utils/`.
- Return a consistent `{ success, data, message }` response shape where the endpoint contract permits it.
- Use descriptive names and keep controllers focused on one responsibility.
- Use transactions for multi-document appointment, payment, refund, or token operations.
- Add pagination to collection endpoints and select only the fields required by the client.
- Test authentication, validation, transactional behavior, and external-service failure paths.

### Deployment checklist

```text
Environment: set required variables, strong JWT secrets, bcrypt admin hash,
             and the production origin allow-list.
Database:    use authenticated MongoDB Atlas or a replica-set deployment,
             create required indexes, and configure backups.
Security:    use HTTPS, secure cookies, correct CORS, CSRF protection,
             rate limits, and protected metrics.
Operations: enable structured logs and alerts, health probes, and API
            response/database performance monitoring.
Scaling:    run behind Nginx or an ingress load balancer, scale stateless
            services horizontally, and use CDN-backed media storage.
```

Docker Compose runs the three application containers for local or single-host deployment. Kubernetes uses separate frontend, admin, and backend deployments and services, with cert-manager providing TLS and ingress routing. Secrets belong in Kubernetes Secrets or a cloud secret manager, never in the repository.

### Performance guidance

- Index frequently searched and sorted fields and use `.lean()` for read-only Mongoose queries.
- Paginate large collections and use `.select()` to reduce response size.
- Cache short-lived doctor and profile reads where freshness allows it; use Redis for shared cache or session state when scaling horizontally.
- Compress API responses, lazy-load frontend routes and images, and use Cloudinary/CDN delivery for media.
- Track API latency, database query performance, error rates, and external provider failures.

## Repository structure

```text
DocNest/
├── backend/
│   ├── config/
│   ├── controller/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── utils/
│   ├── test/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── admin/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── k8s/
│   ├── configmap.yaml
│   ├── ingress.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── admin-deployment.yaml
│   ├── secret.yaml.example
│   └── ...
├── docker-compose.yml
├── Jenkinsfile
├── Readme.md
└── package.json
```

## Prerequisites

- Node.js 20+
- MongoDB or MongoDB Atlas
- Cloudinary account
- Razorpay account
- Groq API key
- SMTP-capable email provider
- Docker and Docker Compose for local containerized setup

## Local development

1. Clone the repository

```bash
git clone https://github.com/Mohit-Y-Kumar/DocNest.git
cd DocNest
```

2. Install backend dependencies

```bash
cd backend
npm install
```

3. Create backend environment variables

```bash
cp .env.example .env
```

Set values for:

- PORT
- NODE_ENV
- MONGO_URI
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD_HASH
- FRONTEND_URL
- APP_URL
- ALLOWED_ORIGINS
- EMAIL_USER
- EMAIL_PASS
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- GROQ_API_KEY

4. Start backend

```bash
cd backend
npm start
```

5. Start frontend

```bash
cd frontend
npm install
npm run dev
```

6. Start admin app

```bash
cd admin
npm install
npm run dev
```

The app runs on local dev ports:

- backend: http://localhost:4000
- frontend: http://localhost:5173
- admin: http://localhost:5174

## Authentication flows

### Patient account

1. Register at `/login`.
2. Open the verification link sent by email.
3. The account is marked verified and the user receives secure HTTP-only access and refresh cookies.
4. Use **Forgot password?** on the login form to request a one-hour reset link.
5. After resetting the password, log in again. Previous user sessions are revoked.

Verification and reset tokens are single-use. If verification email delivery fails, the login screen provides a resend-verification action.

### Doctor account

Doctors are created by an administrator. The administrator sends the doctor the verification token and completes verification from the admin onboarding screen. A doctor can log in only after the account email is verified.

## Appointment and refund workflows

- User, admin, and doctor appointment screens use server-side pagination.
- Paid users can request a refund from **My Appointments** and see the refund status there.
- Refund processing atomically claims a request before calling Razorpay, preventing concurrent duplicate processing.
- After a successful gateway refund, the refund record and appointment cancellation are committed together in a database transaction.

## API highlights

User routes are prefixed with `/api/user`:

- `POST /register`
- `POST /verify-email`
- `POST /resend-verification`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /refresh`
- `POST /logout`
- `GET /appointments?page=1&limit=10`
- `POST /request-refund/:appointmentId`
- `GET /my-refunds?page=1&limit=10`

Access and refresh tokens are stored in role-specific HTTP-only cookies. Refresh tokens are hashed in MongoDB and rotated on every refresh request.

## Production deployment

This project includes Kubernetes manifests for a production-like deployment:

- ingress routing
- TLS setup via cert-manager
- namespace separation for staging and prod
- resource limits and health probes
- Docker image-based rollout
- Jenkins-based CI/CD pipeline

For production, keep secrets outside the repo and inject them through Kubernetes Secret objects or your cloud secret manager.

## Health and observability

The backend exposes:

- /health
- /ready
- /metrics (admin authentication required)
- /api/docs

These are used for health checks, readiness checks, and deployment validation.

## Security notes

- auth cookies are role-specific and hardened
- CORS is restricted by ALLOWED_ORIGINS
- CSRF validation is enabled for state-changing requests
- rate limiting is applied to auth and AI-related routes
- password recovery tokens are hashed, time-limited, and single-use
- refund processing uses an atomic claim and transaction-backed state updates
- socket-sensitive events revalidate the authenticated session
- metrics are protected from public access
- Content Security Policy headers are enabled
- audit logs are emitted without blocking request flow
- production env validation prevents missing critical settings at startup

Never commit `.env` files or provider credentials. Production admin authentication requires `ADMIN_PASSWORD_HASH`; plaintext `ADMIN_PASSWORD` authentication is not supported.

## API documentation

See [backend/API.md](backend/API.md) for the full endpoint reference.

## Validation commands

Run these commands from the project root:

```bash
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix admin run lint
npm --prefix admin run build
```

The backend test suite includes security and API checks. Some integration tests remain marked as TODO until they are connected to a test database and payment provider mocks.

## CI/CD

The repository includes a Jenkins pipeline for building Docker images and deploying to Kubernetes. Use the environment parameter to choose staging or prod before deployment.

## License

This project is intended for internal or educational use unless a separate license agreement is provided.

| GET | `/dashboard` | Doctor | Earnings, patient count, ratings summary |
| GET | `/profile` | Doctor | Own profile |
| POST | `/update-profile` | Doctor | Update fees/address/availability |
| POST | `/view/:docId` | – | Increment doctor profile view count |
| POST | `/like/:docId` | User | Toggle like on a doctor |
| GET | `/ratings` | Doctor | Rating breakdown (1–5 stars) |
| GET | `/visit-stats?period=` | Doctor | New vs. returning patients (`daily`/`monthly`/`yearly`) |
| GET | `/revenue?period=` | Doctor | Revenue chart data |
| GET | `/upcoming-today` | Doctor | Today's remaining appointments |

### Admin (`/api/admin`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/login` | – | Admin login |
| POST | `/add-doctor` | Admin | Add a doctor (+ image upload) |
| POST | `/all-doctors` | Admin | List all doctors |
| POST | `/change-availability` | Admin | Toggle a doctor's availability |
| GET | `/appointments` | Admin | List all appointments platform-wide |
| POST | `/cancel-appointment` | Admin | Cancel any appointment |
| GET | `/dashboard` | Admin | Platform-wide stats |

### Reviews (`/api/reviews`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/rate` | User | Submit a star rating for a completed appointment |
| POST | `/comment/:reviewId` | User | Add a written comment to a rating |
| PUT | `/edit/:id` | User | Edit own review |
| DELETE | `/delete/:id` | User | Delete own review |
| GET | `/doctor/:id` | – | Get a doctor's reviews + rating summary |

### Chat (`/api/chat`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/message` | – | Send a message to the AI symptom-checker chatbot |
| POST | `/upload-image` | User | Upload a chat image |
| GET | `/history/:roomId?page=&limit=` | User | Paginated chat history for a room |
| PUT | `/mark-read/:roomId` | User | Mark messages in a room as read |

### Calls (`/api/calls`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/start` | User | Create a call record |
| PUT | `/status` | User | Update a call's status |
| GET | `/history/:userId` | User | Get a user's call history |

## Real-time Events (Socket.io)

| Event | Direction | Purpose |
|---|---|---|
| `join-room` | client → server | Join a chat/call room |
| `call-user` | client → server | Initiate a call (creates/updates a call record) |
| `incoming-call` | server → client | Notify the receiver of an incoming call |
| `call-accepted` / `call-rejected` / `call-ended` | both | Call lifecycle transitions, persisted to `callModel` |
| `signal` | both | WebRTC offer/answer/ICE candidate relay |
| `send-message` / `receive-message` | both | Chat messaging, persisted to `messageModel` |
| `message-read` / `message-seen` | both | Read receipts |
| `typing` / `stop-typing` | both | Typing indicators |

## Data Models

| Model | Key fields |
|---|---|
| `user` | name, email, password (hashed), image, address, gender, dob, phone |
| `doctor` | name, email, password, image, speciality, degree, experience, about, fees, address, available, slots_booked, averageRating, totalReviews, views, likes, likedBy |
| `appointment` | userId, docId, slotDate, slotTime, userData snapshot, docData snapshot, amount, cancelled, payment, isCompleted |
| `review` | doctor, patient, appointment (unique), rating (1–5), comment, isRated, isReviewed — auto-updates doctor's `averageRating`/`totalReviews` on save/delete |
| `message` | roomId, sender, senderType, name, message, imageUrl, isRead, readAt, time |
| `call` | roomId (unique), callerId/callerModel, receiverId/receiverModel, callType (audio/video), status, startedAt, endedAt, duration (auto-calculated), appointmentId |
| `payment` | appointmentId (unique), userId, razorpay_order_id/payment_id/signature, status, amount |

## Troubleshooting

- **CORS errors in the browser console** — add the failing origin to `ALLOWED_ORIGINS` in `backend/.env` (comma-separated, no spaces required) and restart the backend. Environment variables are only read on startup.
- **401 Unauthorized on protected routes** — the stored token is missing, malformed, or expired. Run `localStorage.removeItem('token')` in the browser console and log in again.
- **MongoDB fails to connect** — set `MONGO_URI` (or `MONGODB_URI`) to the connection string. Booking transactions require MongoDB Atlas, a replica set, or a sharded deployment.
- **AI chatbot returns an error** — confirm `GROQ_API_KEY` is set; the endpoint throws `GROQ_API_KEY is not configured` otherwise. A `429` response means you've hit Groq's rate limit — the API returns a suggested wait time.
- **Rate limit errors** — auth-sensitive routes are limited to 20 requests/15 minutes per IP; all other routes to 200 requests/15 minutes.
- **Doctor/admin dashboard shows no data** — dashboard and analytics routes require the `authDoctor`/`authAdmin` token, not the patient (`authUser`) token — make sure the admin app is sending its own token, not a reused patient token.

