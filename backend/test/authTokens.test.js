import test from 'node:test'
import assert from 'node:assert/strict'
import { accessMaxAge, cookieNames, refreshMaxAge } from '../utils/authTokens.js'
import { buildAuthEmailHtml } from '../controller/userAuthController.js'

test('uses short-lived access and week-long refresh token lifetimes', () => {
    assert.equal(accessMaxAge, 15 * 60 * 1000)
    assert.equal(refreshMaxAge, 7 * 24 * 60 * 60 * 1000)
})

test('uses separate cookie names for each account role', () => {
    assert.deepEqual(cookieNames('user'), { access: 'accessToken', refresh: 'refreshToken' })
    assert.deepEqual(cookieNames('doctor'), { access: 'doctorAccessToken', refresh: 'doctorRefreshToken' })
    assert.deepEqual(cookieNames('admin'), { access: 'adminAccessToken', refresh: 'adminRefreshToken' })
})

test('uses cross-site cookies in production so Render frontend domains can authenticate', async () => {
    const previousNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const moduleUrl = new URL('../utils/authTokens.js', import.meta.url)
    const authTokensModule = await import(`${moduleUrl.href}?t=${Date.now()}`)
    const { cookieOptions } = authTokensModule

    const options = cookieOptions(900000)
    assert.equal(options.sameSite, 'none')
    assert.equal(options.secure, true)

    process.env.NODE_ENV = previousNodeEnv
})

test('auth emails include both OTP and a direct verification link', () => {
    const html = buildAuthEmailHtml({
        title: 'Verify Your DocNest Account',
        name: 'Aarav',
        otp: '482163',
        actionLabel: 'Verify Email',
        link: 'https://example.com/verify-email?token=abc',
        description: 'Use this code to verify your email. The link below also works.',
        expiryText: 'This code expires in 24 hours.'
    })

    assert.match(html, /OTP/i)
    assert.match(html, /482163/i)
    assert.match(html, /https:\/\/example\.com\/verify-email\?token=abc/i)
})
