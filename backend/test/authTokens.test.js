import test from 'node:test'
import assert from 'node:assert/strict'
import { accessMaxAge, cookieNames, refreshMaxAge } from '../utils/authTokens.js'

test('uses short-lived access and week-long refresh token lifetimes', () => {
    assert.equal(accessMaxAge, 15 * 60 * 1000)
    assert.equal(refreshMaxAge, 7 * 24 * 60 * 60 * 1000)
})

test('uses separate cookie names for each account role', () => {
    assert.deepEqual(cookieNames('user'), { access: 'accessToken', refresh: 'refreshToken' })
    assert.deepEqual(cookieNames('doctor'), { access: 'doctorAccessToken', refresh: 'doctorRefreshToken' })
    assert.deepEqual(cookieNames('admin'), { access: 'adminAccessToken', refresh: 'adminRefreshToken' })
})
