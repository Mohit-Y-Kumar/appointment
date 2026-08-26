# DocNest 🩺

DocNest is a full-stack **doctor appointment booking platform** built on the MERN stack. It has three separate apps — a patient-facing site, an admin/doctor dashboard, and a Node/Express API — and includes real-time chat, video/audio calling, an AI symptom-checker chatbot, online payments, and analytics dashboards for doctors and admins.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Real-time Events (Socket.io)](#real-time-events-socketio)
- [Data Models](#data-models)
- [Troubleshooting](#troubleshooting)

## Features

### For Patients (`frontend/`)
- Register/login with JWT-based authentication
- Browse doctors by speciality, view profiles, ratings, and availability
- Book, view, and cancel appointments by date/time slot
- Pay appointment fees online via **Razorpay**, with signature-verified payment confirmation
- Rate and review doctors after a completed appointment (star rating + written comment, editable/deletable)
- Real-time **chat** with a doctor (text + image messages, typing indicators, read receipts)
- **Voice and video calls** with a doctor over WebRTC, signalled through Socket.io
- **AI Symptom Checker / Chatbot** — describes symptoms in natural language (English, Hindi, or Hinglish) and get a suggested medical speciality, powered by Groq's `llama-3.3-70b-versatile` model
- View and edit personal profile (photo, phone, address, DOB, gender)
- Automatic email notifications for booking, cancellation, and successful payment

### For Doctors (`admin/`, doctor role)
- Secure doctor login (separate from patient login)
- Dashboard with earnings, appointment count, unique patient count, average rating, and today's upcoming appointments
- Accept/complete/cancel appointments
- Visit statistics (new vs. returning patients) and revenue charts, filterable by daily/monthly/yearly period
- View patient ratings and review breakdowns
- Update profile (fees, address, availability toggle)
- Live chat and video/audio calls with patients

### For Admins (`admin/`, admin role)
- Separate admin login, authenticated against `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- Add new doctors (with photo upload to Cloudinary)
- View and toggle availability for all doctors
- View and cancel any appointment platform-wide
- Platform-wide dashboard: total doctors, patients, appointments, revenue, and today's cancellations

### Platform-wide
- Doctor profile view/like counters (`views`, `likes`) with per-user like tracking
- Rate-limited APIs (200 req/15min globally, 20 req/15min on auth-sensitive routes) and Helmet-based HTTP security headers
- CORS allow-list driven entirely by an `ALLOWED_ORIGINS` environment variable

## Tech Stack

| Layer | Technology |
|---|---|
# | Patient frontend | 
 React 19 (Vite), Tailwind CSS 4, Axios, React Router, Recharts, react-toastify |
# | Admin/Doctor dashboard | 
React 19 (Vite), Tailwind CSS 4, Axios, React Router, Recharts |
# | Backend 
| Node.js, Express 5 |
| Database | MongoDB (Mongoose) |
| Real-time | Socket.io (chat, calls, WebRTC signalling) |
| Video/Audio calling | `simple-peer` (WebRTC) over Socket.io signalling |
| AI Chatbot | Groq SDK (`llama-3.3-70b-versatile`) |
| Auth | JSON Web Tokens (JWT), bcrypt |
| Payments | Razorpay (order creation + HMAC signature verification) |
| Media storage | Cloudinary |
| Email | Nodemailer (Gmail transport) |
| Security | Helmet, express-rate-limit, CORS allow-list |
| Deployment | Docker, Docker Compose, Kubernetes manifests, Jenkins pipeline |

## Repository Structure

```
DocNest/
├── backend/
│   ├── config/          # mongodb.js, cloudinary.js, mailer.js, emailTemplates.js
│   ├── controller/      # userController, doctorController, adminController,
│   │                     #   chatController (AI), reviewController, callController, uploadController
│   ├── middleware/       # authUser, authDoctor, authAdmin, multer (file uploads)
│   ├── models/            # user, doctor, appointment, review, message, call, payment
│   ├── routes/            # userRoute, doctorRoute, adminRoute, chatRoute, reviewRoute, callRoute
│   └── server.js          # Express app + Socket.io server (chat, calls, WebRTC signalling)
├── frontend/               # Patient-facing React app
│   └── src/
│       ├── pages/          # Home, Doctors, Appointment, MyAppointments, MyProfile, Login, About, Contact
│       └── components/     # Navbar, DoctorCard, ChatWindow, VideoCall, VoiceChat, SymptomChecker, Chatbot, Review, ...
├── admin/                   # Admin + Doctor dashboard React app
│   └── src/
│       ├── pages/Admin/     # Dashboard, AddDoctor, DoctorList, AllAppointments
│       ├── pages/Doctor/    # DoctorDashboard, DoctorAppointments, DoctorChat, DoctorVideoCall, DoctorProfile
│       └── context/          # AdminContext, DoctorContext, AppContext (auth/token state)
├── k8s/                      # Kubernetes manifests (deployments, services, ingress, configmap, secret)
├── docker-compose.yml        # Local multi-container orchestration
├── Jenkinsfile                # CI/CD pipeline
└── README.md
```

## How It Works

**Authentication** — Patients and doctors register/log in separately and each receive a JWT (`{ id }` payload, `JWT_EXPIRES_IN`-day expiry — 7 days by default). Admins log in with credentials checked directly against `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars and receive a JWT with a `role: 'admin'` payload. Every protected route requires `Authorization: Bearer <token>`, verified by `authUser.js`, `authDoctor.js`, or `authAdmin.js` respectively.

**Booking flow** — A patient picks a doctor and an available slot; `bookAppointment` snapshots both the user's and doctor's data into the appointment document (so historical records don't change if a profile is later edited), marks the slot as booked on the doctor record, and emails a confirmation. Cancelling frees the slot back up and emails a cancellation notice.

**Payments** — `paymentRazorpay` creates (or re-fetches) a Razorpay order for an appointment. After the client completes checkout, `verifyRazorpay` recomputes the HMAC-SHA256 signature server-side and only marks the appointment as paid if it matches — preventing forged payment confirmations. A success email is sent on verification.

**Reviews** — A patient can only rate a *completed* appointment they own. Rating and commenting are two separate steps (`isRated` → `isReviewed`), and a Mongoose post-save/post-delete hook automatically recalculates the doctor's `averageRating` and `totalReviews` whenever a review changes.

**Chat & calls** — All real-time features run through a single Socket.io server in `server.js`. Chat messages and read receipts are persisted to MongoDB (`messageModel`) and broadcast to the room. Calls are tracked in `callModel` with status transitions (`ringing` → `accepted`/`rejected` → `ended`) and automatic duration calculation; WebRTC offer/answer/ICE candidates are relayed via the generic `signal` event.

**AI Symptom Checker** — `chatController.js` sends the conversation to Groq's `llama-3.3-70b-versatile` model with a system prompt constrained to DocNest's actual doctor specialities (General physician, Gynecologist, Dermatologist, Pediatricians, Neurologist, Gastroenterologist). The model is instructed to avoid diagnoses/prescriptions and to tag its reply with a `SPECIALITY:` line when it recommends booking a particular type of doctor, which the frontend can parse to suggest doctors.

**Doctor/admin analytics** — Visit stats and revenue are computed on the fly from appointment records, bucketed by day/month/year depending on the requested `period` query param, and returned as chart-ready arrays for Recharts.

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account
- Razorpay account (test keys work for development)
- Groq API key (for the AI chatbot)
- A Gmail account (or adjust `mailer.js` for a different provider) for outgoing email

### 1. Clone and install

```bash
git clone https://github.com/Mohit-Y-Kumar/DocNest.git
cd DocNest
```

Install each app's dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin && npm install
```

### 2. Configure the backend

Create `backend/.env`:

```env
PORT=4000

# NOTE: the code reads this as MONGO_URl (capital letters, lowercase L) — see Troubleshooting
MONGO_URl=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
CURRENCY=INR

EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

ADMIN_EMAIL=your_admin_login_email
ADMIN_PASSWORD=your_admin_login_password

GROQ_API_KEY=your_groq_api_key

# Comma-separated list of allowed frontend/admin origins, no spaces needed
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

Start it:

```bash
cd backend
npm start
```

Runs at `http://localhost:4000`.

### 3. Configure and run the patient frontend

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

```bash
cd frontend
npm run dev
```

Runs at `http://localhost:5173` by default.

### 4. Configure and run the admin/doctor dashboard

Create `admin/.env`:

```env
VITE_BACKEND_URL=http://localhost:4000
```

```bash
cd admin
npm run dev
```

Runs at `http://localhost:5174` by default.

> Whichever origins you run the frontend/admin apps on **must** be listed in the backend's `ALLOWED_ORIGINS`, and the backend must be restarted after any `.env` change.

## Environment Variables

Reference (from `k8s/secret.yaml.example` and actual source usage):

| Variable | Used by | Purpose |
|---|---|---|
| `PORT` | backend | API server port (default 4000) |
| `MONGO_URl` | backend | MongoDB connection string *(note the unusual casing — see Troubleshooting)* |
| `JWT_SECRET` | backend | Secret used to sign/verify JWTs |
| `JWT_EXPIRES_IN` | backend | Token lifetime, e.g. `7d` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | backend | Image upload storage |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | backend | Payment order creation & verification |
| `CURRENCY` | backend | Currency code for Razorpay orders (e.g. `INR`) |
| `EMAIL_USER` / `EMAIL_PASS` | backend | Gmail account used to send transactional emails |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | backend | Hardcoded admin login credentials |
| `GROQ_API_KEY` | backend | AI chatbot / symptom checker |
| `ALLOWED_ORIGINS` | backend | Comma-separated CORS allow-list |
| `VITE_BACKEND_URL` | frontend, admin | Base URL the React apps call for the API |
| `VITE_RAZORPAY_KEY_ID` | frontend | Public Razorpay key used client-side at checkout |

## API Reference

All protected routes require `Authorization: Bearer <token>`.

### User (`/api/user`)
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/register` | – | Create a patient account |
| POST | `/login` | – | Patient login |
| GET | `/get-profile` | User | Get logged-in patient's profile |
| POST | `/update-profile` | User | Update profile (+ optional image upload) |
| POST | `/book-appointment` | User | Book a doctor slot |
| GET | `/appointments` | User | List own appointments |
| POST | `/cancel-appointment` | User | Cancel an appointment |
| POST | `/payment-razorpay` | User | Create/fetch a Razorpay order |
| POST | `/verifyRazorpay` | User | Verify payment signature |

### Doctor (`/api/doctor`)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/list` | – | Public list of doctors |
| POST | `/login` | – | Doctor login |
| GET | `/appointments` | Doctor | List own appointments |
| POST | `/complete-appointment` | Doctor | Mark appointment complete |
| POST | `/cancel-appointment` | Doctor | Cancel appointment |
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
- **MongoDB fails to connect** — `backend/config/mongodb.js` reads the connection string from **`MONGO_URl`** (note the unusual capitalization: `MONGO_URl`, not `MONGODB_URI`). The Kubernetes secret example (`k8s/secret.yaml.example`) uses `MONGODB_URI` instead — if deploying to Kubernetes, either rename the key to `MONGO_URl` in your secret or update `mongodb.js` to match, or the backend will exit on startup with `MONGO_URl is not defined`.
- **AI chatbot returns an error** — confirm `GROQ_API_KEY` is set; the endpoint throws `GROQ_API_KEY is not configured` otherwise. A `429` response means you've hit Groq's rate limit — the API returns a suggested wait time.
- **Rate limit errors** — auth-sensitive routes are limited to 20 requests/15 minutes per IP; all other routes to 200 requests/15 minutes.
- **Doctor/admin dashboard shows no data** — dashboard and analytics routes require the `authDoctor`/`authAdmin` token, not the patient (`authUser`) token — make sure the admin app is sending its own token, not a reused patient token.

