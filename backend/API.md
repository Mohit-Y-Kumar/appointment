# DocNest Backend API

This document describes the backend API used by the patient frontend, admin dashboard, and doctor dashboard.

## Base URL

- Local: http://localhost:4000
- Production: configured via APP_URL or your ingress host

## Authentication

Most protected endpoints require a JWT in an HTTP-only secure cookie or Authorization header depending on the route.

### Cookie names

- user: `docnest_user_access`
- doctor: `docnest_doctor_access`
- admin: `docnest_admin_access`

### Common responses

```json
{
  "success": true,
  "message": "..."
}
```

```json
{
  "success": false,
  "message": "Error message"
}
```

## Health and monitoring

### GET /health

Returns service health status.

#### Response

```json
{
  "success": true,
  "status": "ok",
  "service": "docnest-backend",
  "timestamp": "2026-09-01T00:00:00.000Z",
  "uptime": 123.45
}
```

### GET /ready

Checks DB readiness.

### GET /metrics

Returns runtime metrics and memory info.

### GET /api/docs

Returns a basic OpenAPI-like JSON document for the API.

---

## User endpoints

Base path: /api/user

### POST /register

Create a patient account.

#### Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "StrongPass123",
  "phone": "+919999999999"
}
```

### POST /login

Login for patients.

### POST /refresh

Refresh the current user token family.

### POST /logout

Log the user out and revoke the refresh token.

### GET /get-profile

Get the current patient profile.

### POST /update-profile

Update user profile information. Supports image upload field `image`.

### POST /book-appointment

Book a doctor appointment.

#### Body

```json
{
  "docId": "64d4d75f1a2b6d2e99a1b2c3",
  "date": "2026-09-10",
  "slot": "09:00 AM"
}
```

### GET /appointments

List current user appointments.

### POST /cancel-appointment

Cancel an existing appointment.

### POST /payment-razorpay

Create a Razorpay order.

### POST /verifyRazorpay

Verify the Razorpay payment signature.

### POST /payment/webhook

Razorpay webhook callback endpoint. Must be configured in the Razorpay dashboard.

### POST /request-refund/:appointmentId

Request a refund for an unpaid or eligible appointment.

### GET /refund-status/:refundId

Check the status of a refund.

### GET /my-refunds

List the user’s refund requests.

---

## Doctor endpoints

Base path: /api/doctor

### GET /list

Public list of all doctors.

### POST /login

Doctor login.

### POST /refresh

Refresh doctor tokens.

### POST /logout

Logout doctor session.

### GET /appointments

List appointments for the signed-in doctor.

### POST /complete-appointment

Mark an appointment completed.

### POST /cancel-appointment

Cancel a doctor appointment.

### GET /dashboard

Get doctor dashboard metrics.

### GET /profile

Fetch doctor profile.

### POST /update-profile

Update doctor profile.

### POST /view/:docId

Increment doctor profile view count.

### POST /like/:docId

Like a doctor profile.

### GET /ratings

Get all rating data for a doctor.

### GET /visit-stats

Get patient visit analytics.

### GET /revenue

Get revenue analytics.

### GET /upcoming-today

Show today’s upcoming appointments.

---

## Admin endpoints

Base path: /api/admin

### POST /login

Admin login.

### POST /refresh

Refresh admin token.

### POST /logout

Logout admin session.

### POST /add-doctor

Add a new doctor record with image upload support.

### POST /all-doctors

List registered doctors.

### POST /change-availability

Toggle doctor availability.

### GET /appointments

List all platform appointments.

### POST /cancel-appointment

Cancel any appointment from the admin side.

### GET /dashboard

Get admin dashboard analytics.

### GET /pending-refunds

List refund requests awaiting review.

### POST /process-refund/:refundId

Process an approved refund request.

---

## Review endpoints

Base path: /api/reviews

### POST /rate

Submit a rating for a completed appointment.

### POST /comment/:reviewId

Submit a textual comment for a review.

### PUT /edit/:id

Edit an existing review.

### DELETE /delete/:id

Delete a review.

### GET /doctor/:id

Fetch reviews for a doctor.

---

## Chat endpoints

Base path: /api/chat

### POST /message

Send an AI conversation message or patient-doctor chat message depending on the flow.

### POST /upload-image

Upload a chat image.

### GET /history/:roomId

Get paginated message history.

### PUT /mark-read/:roomId

Mark messages as read for a room.

---

## Call endpoints

Base path: /api/calls

### POST /start

Start a call session.

### PUT /status

Update the call status.

### GET /history/:userId

Get call history for the signed-in user or participant.

---

## Error handling

Typical HTTP status codes:

- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 429 Too Many Requests
- 500 Internal Server Error

## Notes

- All timestamps are ISO 8601 strings.
- All sensitive data is redacted in logs.
- Requests are rate limited in production.
- Payment webhooks should be validated with Razorpay signature verification.
