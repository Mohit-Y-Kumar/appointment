import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeInput, sanitizeChatMessage, sanitizeComment, sanitizeProfileText } from '../utils/validation.js'

/**
 * XSS Security Tests
 * Validates sanitization of user input to prevent XSS attacks
 */

test('sanitizeInput removes HTML tags', t => {
    const xssPayload = '<script>alert("XSS")</script>Hello'
    const sanitized = sanitizeInput(xssPayload)
    
    assert.ok(!sanitized.includes('<script>'))
    assert.ok(!sanitized.includes('</script>'))
    assert.ok(sanitized.includes('Hello'))
})

test('sanitizeInput escapes HTML entities', t => {
    const input = '<img src=x onerror="alert(\'XSS\')">'
    const sanitized = sanitizeInput(input)
    
    // Should be escaped, not executed
    assert.ok(!sanitized.includes('onerror='))
})

test('sanitizeInput respects maxLength parameter', t => {
    const longInput = 'a'.repeat(150)
    const sanitized = sanitizeInput(longInput, 100)
    
    assert.ok(sanitized.length <= 100)
})

test('sanitizeChatMessage removes XSS payload', t => {
    const malicious = 'Hello <img src=x onerror=alert(1)>'
    const sanitized = sanitizeChatMessage(malicious)
    
    assert.ok(!sanitized.includes('onerror'))
    assert.ok(sanitized.includes('Hello'))
})

test('sanitizeChatMessage allows safe HTML entities', t => {
    const input = 'Hello &amp; Goodbye'
    const sanitized = sanitizeChatMessage(input)
    
    // Should preserve safe entities
    assert.ok(sanitized.includes('Goodbye'))
})

test('sanitizeChatMessage enforces 5000 character limit', t => {
    const longMessage = 'a'.repeat(6000)
    const sanitized = sanitizeChatMessage(longMessage)
    
    assert.ok(sanitized.length <= 5000)
})

test('sanitizeComment removes malicious scripts', t => {
    const review = 'Great doctor! <script>fetch("evil.com")</script>'
    const sanitized = sanitizeComment(review)
    
    assert.ok(!sanitized.includes('<script>'))
    assert.ok(sanitized.includes('Great doctor'))
})

test('sanitizeComment enforces 1000 character limit', t => {
    const longComment = 'a'.repeat(1500)
    const sanitized = sanitizeComment(longComment)
    
    assert.ok(sanitized.length <= 1000)
})

test('sanitizeProfileText removes dangerous attributes', t => {
    const profile = 'I am a <div onclick="alert()">Doctor</div>'
    const sanitized = sanitizeProfileText(profile)
    
    assert.ok(!sanitized.includes('onclick'))
    assert.ok(sanitized.includes('Doctor'))
})

test('sanitizeProfileText enforces 500 character limit', t => {
    const longProfile = 'b'.repeat(600)
    const sanitized = sanitizeProfileText(longProfile)
    
    assert.ok(sanitized.length <= 500)
})

test('sanitization handles null/undefined gracefully', t => {
    assert.doesNotThrow(() => {
        sanitizeInput(null)
        sanitizeInput(undefined)
        sanitizeChatMessage(null)
    })
})

test('sanitization preserves legitimate content', t => {
    const legitimateInput = 'I need help with my appointment on 15_01_2024'
    const sanitized = sanitizeInput(legitimateInput)
    
    assert.strictEqual(sanitized, legitimateInput)
})

test('sanitization handles unicode characters', t => {
    const unicodeInput = 'Hello 你好 مرحبا Привет'
    const sanitized = sanitizeInput(unicodeInput)
    
    assert.ok(sanitized.includes('你好'))
    assert.ok(sanitized.includes('مرحبا'))
})

test('sanitization prevents event handler injection', t => {
    const payloads = [
        'text" onmouseover="alert(1)',
        '<svg onload=alert(1)>',
        '<iframe onload=alert(1)>',
        '<body onload=alert(1)>',
    ]
    
    payloads.forEach(payload => {
        const sanitized = sanitizeInput(payload)
        assert.ok(!sanitized.includes('on'))
    })
})
