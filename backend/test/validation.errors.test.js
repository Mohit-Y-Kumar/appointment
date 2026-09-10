import test from 'node:test'
import assert from 'node:assert/strict'
import { validateRequired, validateEmail, validatePassword, validatePhone, validateFutureDate } from '../utils/validationErrors.js'

/**
 * Validation Error Tests
 * Ensures proper validation messages for user feedback
 */

test('validateRequired returns error for missing fields', t => {
    assert.throws(() => {
        validateRequired(['email', 'password'], { email: 'user@example.com' })
    }, /required/i)
})

test('validateRequired accepts all required fields', t => {
    assert.doesNotThrow(() => {
        validateRequired(['email', 'password'], { email: 'user@example.com', password: 'Pass123' })
    })
})

test('validateEmail rejects invalid email formats', t => {
    const invalidEmails = [
        'notanemail',
        'user@',
        '@example.com',
        'user @example.com',
        'user@example',
    ]
    
    invalidEmails.forEach(email => {
        assert.throws(() => validateEmail(email), /valid email/i)
    })
})

test('validateEmail accepts valid email formats', t => {
    const validEmails = [
        'user@example.com',
        'first.last@example.co.uk',
        'user+tag@example.com',
        'user123@test-domain.com',
    ]
    
    validEmails.forEach(email => {
        assert.doesNotThrow(() => validateEmail(email))
    })
})

test('validatePassword enforces minimum requirements', t => {
    const weakPasswords = [
        'weak',
        'nouppercasehere1',
        'NOLOWERCASE123',
        'NoNumbers',
    ]
    
    weakPasswords.forEach(pwd => {
        assert.throws(() => validatePassword(pwd), /Password|lowercase|uppercase|number/i)
    })
})

test('validatePassword accepts strong passwords', t => {
    const strongPasswords = [
        'StrongPass123',
        'MyP@ssw0rd',
        'SecurePassword456',
    ]
    
    strongPasswords.forEach(pwd => {
        assert.doesNotThrow(() => validatePassword(pwd))
    })
})

test('validatePhone rejects invalid phone formats', t => {
    const invalidPhones = [
        '123',
        'not-a-phone',
        '1234567890123456',
        '+1 (invalid)',
    ]
    
    invalidPhones.forEach(phone => {
        assert.throws(() => validatePhone(phone), /valid phone/i)
    })
})

test('validatePhone accepts valid phone formats', t => {
    const validPhones = [
        '9876543210',
        '+919876543210',
        '+1-555-123-4567',
        '9876543210',
    ]
    
    validPhones.forEach(phone => {
        assert.doesNotThrow(() => validatePhone(phone))
    })
})

test('validateFutureDate rejects past dates', t => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const formatted = `${pastDate.getDate()}_${pastDate.getMonth() + 1}_${pastDate.getFullYear()}`
    
    assert.throws(() => validateFutureDate(formatted), /at least 30 minutes/i)
})

test('validateFutureDate accepts future dates beyond 30 minutes', t => {
    const futureDate = new Date()
    futureDate.setMinutes(futureDate.getMinutes() + 45)
    const formatted = `${futureDate.getDate()}_${futureDate.getMonth() + 1}_${futureDate.getFullYear()}`
    
    assert.doesNotThrow(() => validateFutureDate(formatted))
})

test('error response is user-friendly', t => {
    assert.throws(() => {
        validateEmail('invalid-email')
    }, /valid email/i)
})
