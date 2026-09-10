import test from 'node:test'
import assert from 'node:assert/strict'
import { startCall, updateCallStatus } from '../controller/callController.js'
import { submitRating, submitComment, editReview, deleteReview } from '../controller/reviewController.js'
import { paymentRazorpay, verifyRazorpay } from '../controller/userPaymentController.js'

const response = () => {
    const result = { statusCode: 200, body: null }
    return {
        result,
        status(code) { result.statusCode = code; return this },
        json(body) { result.body = body; return this },
        cookie() { return this },
        clearCookie() { return this },
    }
}

const request = (body = {}, params = {}) => ({ body, params, participantId: 'user-id', participantRole: 'user', userId: 'user-id' })

test('rejects malformed call start requests before database access', async () => {
    const res = response()
    await startCall(request({ roomId: 'invalid-room', appointmentId: 'invalid-id' }), res)
    assert.equal(res.result.statusCode, 400)
    assert.equal(res.result.body.success, false)
})

test('rejects invalid call status before database access', async () => {
    const res = response()
    await updateCallStatus(request({ roomId: 'room-id', status: 'invalid' }), res)
    assert.equal(res.result.statusCode, 400)
    assert.match(res.result.body.message, /Status must be one of/)
})

test('rejects invalid review rating identifiers and values', async () => {
    const res = response()
    await submitRating(request({ doctorId: 'bad', appointmentId: 'bad', rating: 6 }), res)
    assert.equal(res.result.statusCode, 400)

    const invalidRatingRes = response()
    await submitRating(request({ doctorId: '507f1f77bcf86cd799439011', appointmentId: '507f1f77bcf86cd799439012', rating: 6 }), invalidRatingRes)
    assert.equal(invalidRatingRes.result.statusCode, 400)
})

test('rejects empty or malformed review mutations', async () => {
    const commentRes = response()
    await submitComment(request({ comment: ' ' }, { reviewId: 'bad' }), commentRes)
    assert.equal(commentRes.result.statusCode, 400)

    const editRes = response()
    await editReview(request({ rating: 0, comment: '' }, { id: 'bad' }), editRes)
    assert.equal(editRes.result.statusCode, 400)

    const deleteRes = response()
    await deleteReview(request(), { ...deleteRes, result: deleteRes.result })
    assert.equal(deleteRes.result.statusCode, 400)
})

test('rejects invalid payment requests before provider access', async () => {
    const orderRes = response()
    await paymentRazorpay(request({ appointmentId: 'bad' }), orderRes)
    assert.equal(orderRes.result.statusCode, 400)

    const verifyRes = response()
    await verifyRazorpay(request({ response: {} }), verifyRes)
    assert.equal(verifyRes.result.statusCode, 400)
})
