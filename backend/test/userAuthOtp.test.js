import test from 'node:test'
import assert from 'node:assert/strict'
import { hashOtp, matchesOtp } from '../controller/userAuthController.js'

test('OTP hashing is deterministic and matches only valid values', () => {
  const otp = '123456'
  const hashed = hashOtp(otp)

  assert.equal(typeof hashed, 'string')
  assert.equal(hashed.length > 0, true)
  assert.equal(hashOtp(otp), hashed)
  assert.equal(matchesOtp(otp, hashed), true)
  assert.equal(matchesOtp('654321', hashed), false)
})
