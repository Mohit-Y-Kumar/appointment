import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidAppointmentDate, isValidFee, isValidSlotTime, parseAppointmentDateTime } from '../utils/validation.js'

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
