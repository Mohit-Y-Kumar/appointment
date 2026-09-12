import test from 'node:test'
import assert from 'node:assert/strict'
import { validateEnv } from '../config/env.js'
import { isValidAppointmentDate, isValidFee, isValidSlotTime, parseAppointmentDateTime } from '../utils/validation.js'

test('accepts Gmail SMTP credentials without OAuth config', () => {
    const previousEnv = { ...process.env }

    try {
        process.env.NODE_ENV = 'development'
        process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz123456'
        process.env.MONGO_URI = 'mongodb://localhost:27017/docnest-test'
        process.env.ADMIN_EMAIL = 'admin@example.com'
        process.env.ADMIN_PASSWORD_HASH = '$2b$10$testhashforvalidationonly'
        process.env.FRONTEND_URL = 'http://localhost:5173'
        process.env.RAZORPAY_KEY_ID = 'rzp_test_123'
        process.env.RAZORPAY_KEY_SECRET = 'secret_123'
        process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_123'
        process.env.EMAIL_USER = 'smtp-user@gmail.com'
        process.env.EMAIL_PASS = 'smtp-password'
        delete process.env.GOOGLE_CLIENT_ID
        delete process.env.GOOGLE_CLIENT_SECRET
        delete process.env.GOOGLE_REFRESH_TOKEN
        delete process.env.GOOGLE_USER

        assert.doesNotThrow(() => validateEnv())
    } finally {
        process.env = previousEnv
    }
})

test('rejects missing SMTP credentials even if OAuth variables are present', () => {
    const previousEnv = { ...process.env }

    try {
        process.env.NODE_ENV = 'development'
        process.env.JWT_SECRET = 'abcdefghijklmnopqrstuvwxyz123456'
        process.env.MONGO_URI = 'mongodb://localhost:27017/docnest-test'
        process.env.ADMIN_EMAIL = 'admin@example.com'
        process.env.ADMIN_PASSWORD_HASH = '$2b$10$testhashforvalidationonly'
        process.env.FRONTEND_URL = 'http://localhost:5173'
        process.env.RAZORPAY_KEY_ID = 'rzp_test_123'
        process.env.RAZORPAY_KEY_SECRET = 'secret_123'
        process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_secret_123'
        process.env.GOOGLE_CLIENT_ID = 'oauth-client-id'
        process.env.GOOGLE_CLIENT_SECRET = 'oauth-client-secret'
        process.env.GOOGLE_REFRESH_TOKEN = 'oauth-refresh-token'
        process.env.GOOGLE_USER = 'noreply@gmail.com'
        delete process.env.EMAIL_USER
        delete process.env.EMAIL_PASS

        assert.throws(() => validateEnv(), /EMAIL_USER\/EMAIL_PASS/i)
    } finally {
        process.env = previousEnv
    }
})

test('accepts positive fees within the production limit', () => {
    assert.equal(isValidFee(500), true)
    assert.equal(isValidFee('500'), true)
})

test('rejects invalid fees', () => {
    assert.equal(isValidFee(0), false)
    assert.equal(isValidFee(-1), false)
    assert.equal(isValidFee('not-a-number'), false)
    assert.equal(isValidFee(10000001), false)
})

test('accepts valid future appointment dates and slot times', () => {
    const future = new Date()
    future.setDate(future.getDate() + 1)
    const date = `${future.getDate()}_${future.getMonth() + 1}_${future.getFullYear()}`

    assert.equal(isValidAppointmentDate(date), true)
    assert.equal(isValidSlotTime('10:00 AM'), true)
})

test('rejects impossible, past, and malformed appointment values', () => {
    assert.equal(isValidAppointmentDate('99_99_9999'), false)
    assert.equal(isValidAppointmentDate('1_1_2020'), false)
    assert.equal(isValidSlotTime('25:90 PM'), false)
})

test('parses DD_MM_YYYY refund dates without locale-dependent swapping', () => {
    const parsed = parseAppointmentDateTime('25_12_2099', '10:30 AM')

    assert.ok(parsed)
    assert.equal(parsed.getFullYear(), 2099)
    assert.equal(parsed.getMonth(), 11)
    assert.equal(parsed.getDate(), 25)
    assert.equal(parsed.getHours(), 10)
    assert.equal(parsed.getMinutes(), 30)
})
